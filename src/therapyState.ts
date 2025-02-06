import PostgresDatabaseAdapter from "@elizaos/adapter-postgres";
import {
    IAgentRuntime,
    type UUID,
} from "@elizaos/core";

export enum TherapyStateStatus {
    COLLECTING_DATA = "COLLECTING_DATA",
    DATA_COLLECTED = "DATA_COLLECTED",
    DATA_APPROVED = "DATA_APPROVED",
    PROPOSALS_APPROVED = "PROPOSALS_APPROVED"
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

    /** Proposed treatment */
    proposedTreatment: string[];

    /** Session started at */
    sessionStartedAt: Date;

    /** Session ended at */
    sessionEndedAt: Date | null;

    /** Treatment plan */
    constructor({ roomId, userId, status, presentSymptoms, relevantHistory, automaticThoughts, cognitiveDistortions, emotionalTransitions, proposedTreatment, sessionStartedAt, sessionEndedAt }: { roomId: UUID; userId: UUID; status: TherapyStateStatus; presentSymptoms: string[]; relevantHistory: string[]; automaticThoughts: string[]; cognitiveDistortions: string[]; emotionalTransitions: string[]; proposedTreatment: string[]; sessionStartedAt: Date; sessionEndedAt: Date }) {
        this.roomId = roomId;
        this.userId = userId;
        this.status = status;
        this.presentSymptoms = presentSymptoms;
        this.relevantHistory = relevantHistory;
        this.automaticThoughts = automaticThoughts;
        this.cognitiveDistortions = cognitiveDistortions;
        this.emotionalTransitions = emotionalTransitions;
        this.proposedTreatment = proposedTreatment;
        this.sessionStartedAt = sessionStartedAt;
        this.sessionEndedAt = sessionEndedAt;
    }

    get isInProgress() {
        return this.status === null || this.status !== TherapyStateStatus.PROPOSALS_APPROVED;
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
            proposedTreatment: [],
            sessionStartedAt: new Date(),
            sessionEndedAt: null,
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
            proposedTreatment: row.proposed_treatment,
            sessionStartedAt: row.session_started_at,
            sessionEndedAt: row.session_ended_at,
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
    const proposedTreatment = ` - proposedTreatment: [${therapyState.proposedTreatment.map(treatment => `"${treatment}"`).join(", ")}]`;

    return `${status}\n${presentSymptoms}\n${relevantHistory}\n${automaticThoughts}\n${cognitiveDistortions}\n${emotionalTransitions}\n${proposedTreatment}`;
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

    await db.query("UPDATE therapy_states SET status=$1, present_symptoms=$2, relevant_history=$3, automatic_thoughts=$4, cognitive_distortions=$5, emotional_transitions=$6, proposed_treatment=$7, session_ended_at=$8 WHERE room_id = $9 AND user_id = $10", [
        therapyState.status,
        therapyState.presentSymptoms,
        therapyState.relevantHistory,
        therapyState.automaticThoughts,
        therapyState.cognitiveDistortions,
        therapyState.emotionalTransitions,
        therapyState.proposedTreatment,
        therapyState.sessionEndedAt,
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

    await db.query("INSERT INTO therapy_states (room_id, user_id, status, present_symptoms, relevant_history, automatic_thoughts, cognitive_distortions, emotional_transitions, proposed_treatment, session_started_at, session_ended_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)", [
        therapyState.roomId,
        therapyState.userId,
        TherapyStateStatus.COLLECTING_DATA,
        therapyState.presentSymptoms,
        therapyState.relevantHistory,
        therapyState.automaticThoughts,
        therapyState.cognitiveDistortions,
        therapyState.emotionalTransitions,
        therapyState.proposedTreatment,
        new Date(),
        null,
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