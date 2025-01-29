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

    constructor({ roomId, userId, status, presentSymptoms, relevantHistory }: { roomId: UUID; userId: UUID; status: TherapyStateStatus; presentSymptoms: string[]; relevantHistory: string[] }) {
        this.roomId = roomId;
        this.userId = userId;
        this.status = status;
        this.presentSymptoms = presentSymptoms;
        this.relevantHistory = relevantHistory;
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
        });
    } else {
        const row = rows[0];

        return new TherapyState({
            roomId: row.room_id,
            userId: row.user_id,
            status: row.status,
            presentSymptoms: row.present_symptoms,
            relevantHistory: row.relevant_history,
        });
    }

};

export const formatTherapyStateAsString = (therapyState: TherapyState) => {
    const status = ` - status: ${therapyState.status || "COLLECTING_DATA"}`;
    const presentSymptoms = ` - presentSymptoms: ${therapyState.presentSymptoms.join(", ")}`;
    const relevantHistory = ` - relevantHistory: ${therapyState.relevantHistory.join(", ")}`;

    return `${status}\n${presentSymptoms}\n${relevantHistory}`;
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

    await db.query("UPDATE therapy_states SET status=$1, present_symptoms=$2, relevant_history=$3 WHERE room_id = $4 AND user_id = $5", [
        therapyState.status,
        therapyState.presentSymptoms,
        therapyState.relevantHistory,
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

    await db.query("INSERT INTO therapy_states (room_id, user_id, status, present_symptoms, relevant_history) VALUES ($1, $2, $3, $4, $5)", [
        therapyState.roomId,
        therapyState.userId,
        TherapyStateStatus.COLLECTING_DATA,
        therapyState.presentSymptoms,
        therapyState.relevantHistory,
    ]);
};
