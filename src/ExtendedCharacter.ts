import { Character } from "@elizaos/core";

type ExtendedCharacter = Character & {
    settings?: {
        introMessage?: string;
    };
    templates?: {
      collectingTherapyDataTemplate?: string;
      therapyDataCollectedTemplate?: string;
      therapyStateEvaluatorTemplate?: string;
      treatmentStartedTemplate?: string;
    };
};

export default ExtendedCharacter;