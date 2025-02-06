import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { formatTherapyStateAsString, getTherapyState, TherapyStateStatus } from "./therapyState.js";
import ExtendedCharacter from "./ExtendedCharacter";

export const therapyStateProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        const therapyState = await getTherapyState({ runtime, roomId: message.roomId, userId: message.userId });
        const extendedCharacter = runtime.character as ExtendedCharacter;
        const templates = extendedCharacter.templates;
        let instructions = "";

        switch (therapyState.status) {
            case null:
                instructions = templates?.providerCOLLECTING_DATA;
                break;

            case TherapyStateStatus.COLLECTING_DATA:
                instructions = templates?.providerCOLLECTING_DATA;
                break;

            case TherapyStateStatus.DATA_COLLECTED:
                instructions = templates?.providerDATA_COLLECTED;
                break;

            case TherapyStateStatus.DATA_APPROVED:
                instructions = templates?.providerDATA_APPROVED;
                break;

            case TherapyStateStatus.PROPOSALS_APPROVED:
                instructions = templates?.providerPROPOSALS_APPROVED;
                break;
        }

        let therapyStateString = 'Therapy State:\n' + formatTherapyStateAsString(therapyState);

        return therapyStateString + "\n\n" + instructions;
    },
};