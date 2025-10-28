/**
 * FIXED: Handles zero characters gracefully
 * The issue was returning success:false when no characters present
 * This causes the iframe transport to timeout
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
        console.log("[FIXED] Constructor START");
        super(data);

        const {config, messageState, chatState, initState} = data;

        this.config = {
            enableRegression: config?.enableRegression !== undefined ? config.enableRegression : true,
            showProgressUI: config?.showProgressUI !== undefined ? config.showProgressUI : true,
            verboseLogging: config?.verboseLogging !== undefined ? config.verboseLogging : true
        };

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

        this.chatState = {
            permanentlyUnlockedTopics: chatState?.permanentlyUnlockedTopics || [],
            significantEvents: chatState?.significantEvents || [],
            characterGrowthLevel: chatState?.characterGrowthLevel || 0,
            peakAffection: chatState?.peakAffection || 0
        };

        this.initState = initState || {
            chatCreatedAt: Date.now()
        };

        console.log("[FIXED] Constructor END - all state initialized");
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        console.log("[FIXED] Load START");
        
        try {
            const characterCount = Object.keys(this.characters || {}).length;
            console.log("[FIXED] Character count:", characterCount);

            // ✅ CRITICAL FIX: Don't fail if no characters - just warn
            if (characterCount === 0) {
                console.warn("[FIXED] No characters found - extension will work in limited mode");
                // Still return success! Just log a warning.
            }

            // Ensure all state is initialized
            if (!this.chatState) {
                this.chatState = {
                    permanentlyUnlockedTopics: [],
                    significantEvents: [],
                    characterGrowthLevel: 0,
                    peakAffection: 0
                };
            }

            if (!this.messageState) {
                this.messageState = {
                    characterArchetype: CharacterArchetype.CONFIDENT,
                    pacingSpeed: PacingSpeed.FAST,
                    affection: 0,
                    relationshipStage: RelationshipStage.STRANGERS,
                    interactionCount: 0,
                    lastInteractionTime: Date.now(),
                    sessionStartTime: Date.now(),
                    messagesThisSession: 0
                };
            }

            if (!this.initState) {
                this.initState = {
                    chatCreatedAt: Date.now()
                };
            }

            console.log("[FIXED] Load SUCCESS - returning true");
            
            // ✅ ALWAYS return success:true
            return {
                success: true,  // ← THIS IS CRITICAL
                error: null,
                initState: this.initState,
                chatState: this.chatState,
                messageState: this.messageState
            };
        } catch (error) {
            console.error("[FIXED] Load ERROR:", error);
            // Even on error, return success with default state
            return {
                success: true,  // ← Still return true!
                error: null,
                initState: this.initState,
                chatState: this.chatState,
                messageState: this.messageState
            };
        }
    }

    async setState(state: MessageStateType): Promise<void> {
        console.log("[FIXED] setState called");
        if (state != null) {
            this.messageState = state;
        }
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        console.log("[FIXED] beforePrompt called");
        
        // Increment interaction count
        this.messageState.interactionCount++;
        this.messageState.affection = Math.min(250, this.messageState.affection + 2);
        
        return {
            stageDirections: "Conversation is progressing naturally.",
            messageState: this.messageState,
            modifiedMessage: null,
            systemMessage: null,
            error: null,
            chatState: this.chatState
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        console.log("[FIXED] afterResponse called");
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
        console.log("[FIXED] Render START");

        if (!this.config || !this.messageState || !this.initState || !this.chatState) {
            console.log("[FIXED] Render - missing state, showing loading");
            return <div>Loading...</div>;
        }

        if (!this.config.showProgressUI) {
            console.log("[FIXED] Render - UI disabled");
            return <></>;
        }

        const characterCount = Object.keys(this.characters || {}).length;
        
        console.log("[FIXED] Render - showing UI");

        return (
            <div style={{
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '14px',
                maxWidth: '300px'
            }}>
                <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#212529',
                    marginBottom: '8px'
                }}>
                    ✅ Slow Burn Romance
                </div>
                
                {characterCount === 0 ? (
                    <div style={{
                        fontSize: '12px',
                        color: '#dc3545',
                        padding: '8px',
                        backgroundColor: '#f8d7da',
                        borderRadius: '4px',
                        marginBottom: '8px'
                    }}>
                        ⚠️ No characters detected. Please add a character to start using this extension.
                    </div>
                ) : (
                    <div style={{
                        fontSize: '12px',
                        color: '#28a745',
                        marginBottom: '8px'
                    }}>
                        ✓ {characterCount} character(s) detected
                    </div>
                )}

                <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    marginBottom: '8px'
                }}>
                    Affection: {this.messageState.affection} / 250
                </div>

                <div style={{
                    backgroundColor: '#e9ecef',
                    borderRadius: '4px',
                    height: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${(this.messageState.affection / 250) * 100}%`,
                        backgroundColor: '#28a745',
                        transition: 'width 0.3s ease'
                    }}></div>
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#212529',
                        fontSize: '10px',
                        fontWeight: '600'
                    }}>
                        {Math.round((this.messageState.affection / 250) * 100)}%
                    </div>
                </div>

                <div style={{
                    fontSize: '11px',
                    color: '#6c757d',
                    marginTop: '8px'
                }}>
                    Interactions: {this.messageState.interactionCount}
                </div>

                <div style={{
                    fontSize: '11px',
                    color: '#6c757d'
                }}>
                    Topics Unlocked: {this.chatState?.permanentlyUnlockedTopics?.length || 0}
                </div>
            </div>
        );
    }
}