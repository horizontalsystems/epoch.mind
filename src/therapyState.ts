import PostgresDatabaseAdapter from "@elizaos/adapter-postgres";
import {
    IAgentRuntime,
    type UUID,
} from "@elizaos/core";

export enum TherapyStateStatus {
    COLLECTING_DATA = "COLLECTING_DATA",
    DATA_COLLECTED = "DATA_COLLECTED",
}

export class TherapyState {
    /** Room ID where goal exists */
    roomId: UUID;

    /** User ID of goal owner */
    userId: UUID;

    /** Current status */
    status: TherapyStateStatus;

    /** Present symptoms */
    presentSymptoms: string[];

    /** Relevant history */
    relevantHistory: string[];

    /** Automatic thoughts */
    automaticThoughts: string[];

    /** Cognitive distortions */
    cognitiveDistortions: string[];

    /** Emotional transitions */
    emotionalTransitions: string[];

    constructor({ roomId, userId, status, presentSymptoms, relevantHistory, automaticThoughts, cognitiveDistortions, emotionalTransitions }: { roomId: UUID; userId: UUID; status: TherapyStateStatus; presentSymptoms: string[]; relevantHistory: string[]; automaticThoughts: string[]; cognitiveDistortions: string[]; emotionalTransitions: string[] }) {
        this.roomId = roomId;
        this.userId = userId;
        this.status = status;
        this.presentSymptoms = presentSymptoms;
        this.relevantHistory = relevantHistory;
        this.automaticThoughts = automaticThoughts;
        this.cognitiveDistortions = cognitiveDistortions;
        this.emotionalTransitions = emotionalTransitions;
    }

    get isInProgress() {
        return this.status === null || this.status === TherapyStateStatus.COLLECTING_DATA;
    }
}

export const getTherapyState = async ({
    runtime,
    roomId,
    userId
}: {
    runtime: IAgentRuntime;
    roomId: UUID;
    userId?: UUID;
    count?: number;
}) : Promise<TherapyState> => {
    if (!(runtime.databaseAdapter instanceof PostgresDatabaseAdapter)) {
        throw new Error("Database adapter must be an instance of PostgresDatabaseAdapter");
    }

    const db = runtime.databaseAdapter as PostgresDatabaseAdapter;
    let { rows } = await db.query("SELECT * FROM therapy_states WHERE room_id = $1 AND user_id = $2", [roomId, userId]);

    if (rows.length === 0) {
        return new TherapyState({
            roomId,
            userId,
            status: null,
            presentSymptoms: [],
            relevantHistory: [],
            automaticThoughts: [],
            cognitiveDistortions: [],
            emotionalTransitions: [],
        });
    } else {
        const row = rows[0];

        return new TherapyState({
            roomId: row.room_id,
            userId: row.user_id,
            status: row.status,
            presentSymptoms: row.present_symptoms,
            relevantHistory: row.relevant_history,
            automaticThoughts: row.automatic_thoughts,
            cognitiveDistortions: row.cognitive_distortions,
            emotionalTransitions: row.emotional_transitions,
        });
    }

};

export const formatTherapyStateAsString = (therapyState: TherapyState) => {
    const status = ` - status: ${therapyState.status || "COLLECTING_DATA"}`;
    const presentSymptoms = ` - presentSymptoms: [${therapyState.presentSymptoms.map(symptom => `"${symptom}"`).join(", ")}]`;
    const relevantHistory = ` - relevantHistory: [${therapyState.relevantHistory.map(history => `"${history}"`).join(", ")}]`;
    const automaticThoughts = ` - automaticThoughts: [${therapyState.automaticThoughts.map(thought => `"${thought}"`).join(", ")}]`;
    const cognitiveDistortions = ` - cognitiveDistortions: [${therapyState.cognitiveDistortions.map(distortion => `"${distortion}"`).join(", ")}]`;
    const emotionalTransitions = ` - emotionalTransitions: [${therapyState.emotionalTransitions.map(transition => `"${transition}"`).join(", ")}]`;

    return `${status}\n${presentSymptoms}\n${relevantHistory}\n${automaticThoughts}\n${cognitiveDistortions}\n${emotionalTransitions}`;
};

export const updateTherapyState = async ({
    runtime,
    therapyState,
}: {
    runtime: IAgentRuntime;
    therapyState: TherapyState;
}) => {
    if (!(runtime.databaseAdapter instanceof PostgresDatabaseAdapter)) {
        throw new Error("Database adapter must be an instance of PostgresDatabaseAdapter");
    }

    const existingTherapyState = await getTherapyState({ runtime, roomId: therapyState.roomId, userId: therapyState.userId });
    if (existingTherapyState.status === null) {
        await createTherapyState({ runtime, therapyState });
        return;
    }

    const db = runtime.databaseAdapter as PostgresDatabaseAdapter;

    await db.query("UPDATE therapy_states SET status=$1, present_symptoms=$2, relevant_history=$3, automatic_thoughts=$4, cognitive_distortions=$5, emotional_transitions=$6 WHERE room_id = $7 AND user_id = $8", [
        therapyState.status,
        therapyState.presentSymptoms,
        therapyState.relevantHistory,
        therapyState.automaticThoughts,
        therapyState.cognitiveDistortions,
        therapyState.emotionalTransitions,
        therapyState.roomId,
        therapyState.userId
    ]);
};

export const createTherapyState = async ({
    runtime,
    therapyState,
}: {
    runtime: IAgentRuntime;
    therapyState: TherapyState;
}) => {
    const db = runtime.databaseAdapter as PostgresDatabaseAdapter;

    await db.query("INSERT INTO therapy_states (room_id, user_id, status, present_symptoms, relevant_history, automatic_thoughts, cognitive_distortions, emotional_transitions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [
        therapyState.roomId,
        therapyState.userId,
        TherapyStateStatus.COLLECTING_DATA,
        therapyState.presentSymptoms,
        therapyState.relevantHistory,
        therapyState.automaticThoughts,
        therapyState.cognitiveDistortions,
        therapyState.emotionalTransitions,
    ]);
};

export const resetTherapyState = async ({
    runtime,
    roomId,
    userId,
}: {
    runtime: IAgentRuntime;
    roomId: UUID;
    userId: UUID;
}) => {
    const db = runtime.databaseAdapter as PostgresDatabaseAdapter;

    await db.query('DELETE FROM therapy_states WHERE "room_id" = $1 AND "user_id" = $2', [roomId, userId]);
    await db.query('DELETE FROM memories WHERE "roomId" = $1', [roomId]);
};