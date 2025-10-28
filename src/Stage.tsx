/**
 * DIAGNOSTIC VERSION - Minimal Stage to identify timeout issue
 * This removes all complex logic to isolate the problem
 */

import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

enum CharacterArchetype {
    CONFIDENT = "confident"
}

enum PacingSpeed {
    FAST = "fast"
}

enum RelationshipStage {
    STRANGERS = "strangers"
}

type ConfigType = {
    enableRegression: boolean;
    showProgressUI: boolean;
    verboseLogging: boolean;
};

type InitStateType = {
    chatCreatedAt: number;
};

type MessageStateType = {
    characterArchetype: CharacterArchetype;
    pacingSpeed: PacingSpeed;
    affection: number;
    relationshipStage: RelationshipStage;
    interactionCount: number;
    lastInteractionTime: number;
    sessionStartTime: number;
    messagesThisSession: number;
};

type ChatStateType = {
    permanentlyUnlockedTopics: string[];
    significantEvents: Array<{
        event: string;
        timestamp: number;
        affectionAtTime: number;
    }>;
    characterGrowthLevel: number;
    peakAffection: number;
};

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
    declare config: ConfigType;
    declare messageState: MessageStateType;
    declare chatState: ChatStateType;
    declare initState: InitStateType;
    declare characters: any;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        console.log("[DIAGNOSTIC] Constructor START");
        super(data);

        const {config, messageState, chatState, initState} = data;

        // Minimal config
        this.config = {
            enableRegression: config?.enableRegression !== undefined ? config.enableRegression : true,
            showProgressUI: config?.showProgressUI !== undefined ? config.showProgressUI : true,
            verboseLogging: config?.verboseLogging !== undefined ? config.verboseLogging : true
        };

        // Minimal messageState
        this.messageState = messageState || {
            characterArchetype: CharacterArchetype.CONFIDENT,
            pacingSpeed: PacingSpeed.FAST,
            affection: 0,
            relationshipStage: RelationshipStage.STRANGERS,
            interactionCount: 0,
            lastInteractionTime: Date.now(),
            sessionStartTime: Date.now(),
            messagesThisSession: 0
        };

        // Minimal chatState - CRITICAL
        this.chatState = {
            permanentlyUnlockedTopics: chatState?.permanentlyUnlockedTopics || [],
            significantEvents: chatState?.significantEvents || [],
            characterGrowthLevel: chatState?.characterGrowthLevel || 0,
            peakAffection: chatState?.peakAffection || 0
        };

        // Minimal initState
        this.initState = initState || {
            chatCreatedAt: Date.now()
        };

        console.log("[DIAGNOSTIC] Constructor END - chatState initialized:", !!this.chatState);
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        console.log("[DIAGNOSTIC] Load START");
        
        try {
            const characterCount = Object.keys(this.characters || {}).length;
            console.log("[DIAGNOSTIC] Character count:", characterCount);

            if (characterCount === 0) {
                console.log("[DIAGNOSTIC] No characters found");
                return {
                    success: false,
                    error: "No characters found",
                    initState: this.initState,
                    chatState: this.chatState,
                    messageState: this.messageState
                };
            }

            console.log("[DIAGNOSTIC] Load SUCCESS");
            return {
                success: true,
                error: null,
                initState: this.initState,
                chatState: this.chatState,
                messageState: this.messageState
            };
        } catch (error) {
            console.error("[DIAGNOSTIC] Load ERROR:", error);
            return {
                success: false,
                error: String(error),
                initState: this.initState,
                chatState: this.chatState,
                messageState: this.messageState
            };
        }
    }

    async setState(state: MessageStateType): Promise<void> {
        console.log("[DIAGNOSTIC] setState called");
        if (state != null) {
            this.messageState = state;
        }
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        console.log("[DIAGNOSTIC] beforePrompt called");
        return {
            stageDirections: "Test directions",
            messageState: this.messageState,
            modifiedMessage: null,
            systemMessage: null,
            error: null,
            chatState: this.chatState
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        console.log("[DIAGNOSTIC] afterResponse called");
        return {
            stageDirections: null,
            messageState: this.messageState,
            modifiedMessage: null,
            systemMessage: null,
            error: null,
            chatState: null
        };
    }

    render(): ReactElement {
        console.log("[DIAGNOSTIC] Render START");
        console.log("[DIAGNOSTIC] config:", !!this.config);
        console.log("[DIAGNOSTIC] messageState:", !!this.messageState);
        console.log("[DIAGNOSTIC] initState:", !!this.initState);
        console.log("[DIAGNOSTIC] chatState:", !!this.chatState);

        // CRITICAL: Check all state
        if (!this.config || !this.messageState || !this.initState || !this.chatState) {
            console.log("[DIAGNOSTIC] Render EARLY RETURN - missing state");
            return <div>Loading...</div>;
        }

        if (!this.config.showProgressUI) {
            console.log("[DIAGNOSTIC] Render EARLY RETURN - UI disabled");
            return <></>;
        }

        console.log("[DIAGNOSTIC] Render RENDERING UI");

        // Minimal UI
        return (
            <div style={{
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '14px',
                maxWidth: '300px'
            }}>
                <div>
                    <div style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        marginBottom: '8px'
                    }}>
                        Relationship Progress (Diagnostic)
                    </div>
                    <div style={{
                        fontSize: '12px',
                        marginBottom: '12px'
                    }}>
                        Affection: {this.messageState.affection} / 250
                    </div>
                    <div style={{
                        fontSize: '12px'
                    }}>
                        Topics: {this.chatState?.permanentlyUnlockedTopics?.length || 0}
                    </div>
                </div>
            </div>
        );
    }
}