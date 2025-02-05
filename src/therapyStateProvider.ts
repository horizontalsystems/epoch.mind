import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { formatTherapyStateAsString, getTherapyState, TherapyStateStatus } from "./therapyState.js";
import ExtendedCharacter from "./ExtendedCharacter";

const collectingTherapyDataTemplate = `# INSTRUCTION:
Ask the user for more information about his/her mental health issue. Try to get more concrete information on the symptoms and the relevant history.`;

const therapyDataCollectedTemplate = `# INSTRUCTION:
The user has provided all the necessary information. Acknowledge the user on the data collected and tell about the treatment progress. Use longer messages to explain strategies and invite collaborative discussion.`;

const treatmentStartedTemplate = `# INSTRUCTION:
The user has provided all the necessary information. Generate a treatment plan for the user according to the information provided in the recent conversation and the therapy state.`;


export const therapyStateProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        // Data retrieval logic for the provider
        const therapyState = await getTherapyState({ runtime, roomId: message.roomId, userId: message.userId });
        let result = 'Therapy State:\n' + formatTherapyStateAsString(therapyState);

        const extendedCharacter = runtime.character as ExtendedCharacter;
        
        switch (therapyState.status) {
            case null:
                result += "\n\n" + extendedCharacter.templates?.collectingTherapyDataTemplate || collectingTherapyDataTemplate;
                break;

            case TherapyStateStatus.COLLECTING_DATA:
                result += "\n\n" + extendedCharacter.templates?.collectingTherapyDataTemplate || collectingTherapyDataTemplate;
                break;

            case TherapyStateStatus.DATA_COLLECTED:
                result += "\n\n" + extendedCharacter.templates?.therapyDataCollectedTemplate || therapyDataCollectedTemplate;
                break;

            case TherapyStateStatus.TREATMENT_STARTED:
                result += "\n\n" + extendedCharacter.templates?.treatmentStartedTemplate || treatmentStartedTemplate;
                break;
        }

        return result;
    },
};