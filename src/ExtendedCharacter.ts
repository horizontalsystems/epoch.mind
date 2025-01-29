import { Character } from "@elizaos/core";

type ExtendedCharacter = Character & {
    templates?: {
      collectingTherapyDataTemplate?: string;
      therapyDataCollectedTemplate?: string;
      therapyStateEvaluatorTemplate?: string;
    };
};

export default ExtendedCharacter;