import { composeContext, Objective } from "@elizaos/core";
import { generateText } from "@elizaos/core";
import { parseJSONObjectFromText } from "@elizaos/core";
import {
    IAgentRuntime,
    Memory,
    ModelClass,
    type State,
    Evaluator,
} from "@elizaos/core";
import { formatTherapyStateAsString, getTherapyState, TherapyState, TherapyStateStatus, updateTherapyState } from "./therapyState.ts";
import ExtendedCharacter from "./ExtendedCharacter.ts";

async function handler(
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
): Promise<TherapyState[]> {
    const therapyState = await getTherapyState({ runtime, roomId: message.roomId, userId: message.userId });
    const extendedCharacter = runtime.character as ExtendedCharacter;
    const templates = extendedCharacter.templates;

    let instructions = "";
    switch (therapyState.status) {
        case null:
            instructions = templates?.evaluatorCOLLECTING_DATA;
            break;
        case TherapyStateStatus.COLLECTING_DATA:
            instructions = templates?.evaluatorCOLLECTING_DATA;
            break;
        case TherapyStateStatus.DATA_COLLECTED:
            instructions = templates?.evaluatorDATA_COLLECTED;
            break;
        case TherapyStateStatus.DATA_APPROVED:
            instructions = templates?.evaluatorDATA_APPROVED;
            break;
    }

    state = (await runtime.composeState(message)) as State;
    const evaluatorState = { 
        ...state, 
        therapyStateJsonString: formatTherapyStateAsString(therapyState),
        instructions
    }

    const context = composeContext({
        state: evaluatorState,
        template: templates?.evaluatorTEMPLATE,
    });

    console.log("therapyStateEvaluator prompt:", context);

    // Request generateText from OpenAI to analyze conversation and suggest goal updates
    const response = await generateText({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    });

    // Parse the JSON response to extract goal updates
    const updates = parseJSONObjectFromText(response);

    // Apply the updates to the therapy state
    const updatedTherapyState = {
        ...updates,
        sessionStartedAt: therapyState.sessionStartedAt,
        sessionEndedAt: therapyState.sessionEndedAt,
        roomId: therapyState.roomId,
        userId: therapyState.userId,
    } as TherapyState;

    console.log("updatedTherapyState: ", updatedTherapyState);

    if (updatedTherapyState.status === TherapyStateStatus.PROPOSALS_APPROVED && !updatedTherapyState.sessionEndedAt) {
        updatedTherapyState.sessionEndedAt = new Date();
    }

    // Update state in the database
    await updateTherapyState({ runtime, therapyState: updatedTherapyState });

    return [updatedTherapyState];
}

export const therapyStateEvaluator: Evaluator = {
    name: "UPDATE_THERAPY_STATE",
    alwaysRun: true,
    similes: [
        "UPDATE_STATE",
        "EDIT_THERAPY_STATE",
        "UPDATE_PRESENT_SYMPTOMS",
        "UPDATE_RELEVANT_HISTORY",
    ],
    validate: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        // Check if there are active goals that could potentially be updated
        const therapyState = await getTherapyState({
            runtime,
            roomId: message.roomId,
            userId: message.userId,
        });

        return therapyState?.isInProgress;
    },
    description: "Analyze the conversation and update the status of the therapy flow based on the new information provided.",
    handler,
    examples: [
        {
            context: `Actors in the scene:
  {{user1}}: A person with anxiety.
  {{user2}}: A therapist.

  Therapy State:
   - status: COLLECTING_DATA
   - presentSymptoms: ["anxiety", "panic attacks", "social anxiety"]
   - relevantHistory: ["I've been feeling anxious for the past month", "I've been avoiding social situations"]
   - automaticThoughts: []
   - cognitiveDistortions: []
   - emotionalTransitions: []
   - proposedTreatment: []
`,
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Hey",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Hey, how are you feeling? What's on your mind?",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "I'm feeling anxious. I've been avoiding social situations for the past month.",
                    },
                },
            ],

            outcome: `{
                "status": "COLLECTING_DATA",
                "presentSymptoms": ["anxiety", "panic attacks", "social anxiety"],
                "relevantHistory": ["I've been feeling anxious for the past month", "I've been avoiding social situations"],
                "automaticThoughts": [],
                "cognitiveDistortions": [],
                "emotionalTransitions": [],
                "proposedTreatment": []
            }`,
        },

        {
            context: `Actors in the scene:
  {{user1}}: A person with fear of failure.
  {{user2}}: A therapist.

  Therapy State:
  - status: COLLECTING_DATA
  - presentSymptoms: ["fear of failure"]
  - relevantHistory: ["I've been feeling anxious about my job for the past month"]
  - automaticThoughts: []
  - cognitiveDistortions: []
  - emotionalTransitions: []
  - proposedTreatment: []
`,
            messages: [
                {
                    user: "{{user1}}",
                    content: { text: "Hi, what's next?" },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Do you think you've mentioned all the issues you're facing?",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "Yes, I've mentioned everything.",
                    },
                },
            ],

            outcome: `{
                "status": "DATA_COLLECTED",
                "presentSymptoms": ["fear of failure"],
                "relevantHistory": ["I've been feeling anxious about my job for the past month"],
                "automaticThoughts": [],
                "cognitiveDistortions": [],
                "emotionalTransitions": [],
                "proposedTreatment": []
            }`,
        },
    ],
};
