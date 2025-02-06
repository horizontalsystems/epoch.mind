import { Character } from "@elizaos/core";

type ExtendedCharacter = Character & {
    settings?: {
        introMessage?: string;
    };
    templates?: {
      providerCOLLECTING_DATA?: string;
      providerDATA_COLLECTED?: string;
      providerDATA_APPROVED?: string;
      providerPROPOSALS_APPROVED?: string;
      evaluatorTEMPLATE?: string;
      evaluatorCOLLECTING_DATA?: string;
      evaluatorDATA_COLLECTED?: string;
      evaluatorDATA_APPROVED?: string;
  }
};

export default ExtendedCharacter;