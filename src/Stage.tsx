/**
 * ============================================================================
 * SLOW BURN ROMANCE STAGE
 * ============================================================================
 * A comprehensive romance progression system for LLM character bots
 *
 * Features:
 * - 7 relationship stages (Strangers → Romance)
 * - Affection system (0-250 scale)
 * - 4 character archetypes (configurable via commands)
 * - 4 pacing speeds (configurable via commands)
 * - In-chat command system for configuration
 * - Content unlocking system
 * - Boundary enforcement
 * - Visual progress UI
 *
 * Defaults:
 * - Character Archetype: GUARDED (0.7× multiplier)
 * - Pacing Speed: SLOW (0.75× multiplier)
 * - Combined speed: 0.525× (~476 messages to max)
 * - Enable Regression: true
 * - Show Progress UI: true
 * - Verbose Logging: false
 */

import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * Character archetype configuration
 */
enum CharacterArchetype {
    TSUNDERE = "tsundere",
    SHY = "shy",
    CONFIDENT = "confident",    // DEFAULT
    GUARDED = "guarded"
}

/**
 * Pacing speed multiplier
 */
enum PacingSpeed {
    GLACIAL = "glacial",
    SLOW = "slow",
    MODERATE = "moderate",
    FAST = "fast"               // DEFAULT
}

/**
 * Relationship stage enum
 */
enum RelationshipStage {
    STRANGERS = "strangers",
    ACQUAINTANCES = "acquaintances",
    FRIENDS = "friends",
    GOOD_FRIENDS = "good_friends",
    CLOSE_FRIENDS = "close_friends",
    ROMANTIC_TENSION = "romantic_tension",
    ROMANCE = "romance"
}

/**
 * Configuration type - system-level settings only
 */
type ConfigType = {
    enableRegression: boolean;
    showProgressUI: boolean;
    verboseLogging: boolean;
};

/**
 * Init state - set once at chat creation
 */
type InitStateType = {
    proceduralSeed: string;
    chatCreatedAt: number;
};

/**
 * Message state - includes user-configurable archetype and pacing
 */
type MessageStateType = {
    characterArchetype: CharacterArchetype;
    pacingSpeed: PacingSpeed;
    affection: number;
    relationshipStage: RelationshipStage;
    interactionCount: number;
    lastInteractionTime: number;
    emotionalTone: string;
    currentMood: string;
    flags: {
        firstCompliment: boolean;
        sharedVulnerability: boolean;
        hadArgument: boolean;
        metFriends: boolean;
        firstDateAttempt: boolean;
        confessedFeelings: boolean;
        firstPhysicalContact: boolean;
    };
    discussedTopics: string[];
    recentConversationSummary: string[];
    sessionStartTime: number;
    messagesThisSession: number;
};

/**
 * Chat state - persisted across all branches
 */
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

/**
 * ============================================================================
 * CONSTANTS
 * ============================================================================
 */

const STAGE_THRESHOLDS: { [key in RelationshipStage]: number } = {
    [RelationshipStage.STRANGERS]: 0,
    [RelationshipStage.ACQUAINTANCES]: 36,
    [RelationshipStage.FRIENDS]: 71,
    [RelationshipStage.GOOD_FRIENDS]: 106,
    [RelationshipStage.CLOSE_FRIENDS]: 141,
    [RelationshipStage.ROMANTIC_TENSION]: 176,
    [RelationshipStage.ROMANCE]: 211
};

const AFFECTION_GAINS = {
    base_message: 2,
    compliment: 5,
    asking_about_character: 3,
    remembering_conversation: 5,
    emotional_vulnerability: 10,
    making_laugh: 5,
    time_bonus_per_5min: 2,
    thoughtful_message: 3
};

const AFFECTION_LOSSES = {
    rude_behavior: -10,
    pushing_boundaries: -15,
    inconsistent_behavior: -5,
    short_disengaged_message: -1
};

const PACING_MULTIPLIERS: { [key in PacingSpeed]: number } = {
    [PacingSpeed.GLACIAL]: 0.5,
    [PacingSpeed.SLOW]: 0.75,
    [PacingSpeed.MODERATE]: 1.0,
    [PacingSpeed.FAST]: 1.5
};

const ARCHETYPE_MULTIPLIERS: { [key in CharacterArchetype]: number } = {
    [CharacterArchetype.TSUNDERE]: 0.8,
    [CharacterArchetype.SHY]: 0.9,
    [CharacterArchetype.CONFIDENT]: 1.0,
    [CharacterArchetype.GUARDED]: 0.7
};

const ARCHETYPE_DESCRIPTIONS: { [key in CharacterArchetype]: string } = {
    [CharacterArchetype.TSUNDERE]: "Deflects compliments, hides feelings behind sharp words (0.8× speed)",
    [CharacterArchetype.SHY]: "Gets flustered easily, needs encouragement to open up (0.9× speed)",
    [CharacterArchetype.CONFIDENT]: "Direct and clear about feelings, takes initiative (1.0× speed)",
    [CharacterArchetype.GUARDED]: "Trust issues, needs consistency and patience (0.7× speed)"
};

const PACING_DESCRIPTIONS: { [key in PacingSpeed]: string } = {
    [PacingSpeed.GLACIAL]: "Extremely slow burn (~500 messages to max affection)",
    [PacingSpeed.SLOW]: "Slow burn (~330 messages to max affection)",
    [PacingSpeed.MODERATE]: "Moderate pace (~250 messages to max affection)",
    [PacingSpeed.FAST]: "Quick progression (~165 messages to max affection)"
};

const REGRESSION_MULTIPLIER = 2.0;

const UNLOCKABLE_TOPICS: { [key: string]: number } = {
    family_background: 50,
    past_relationships: 100,
    dreams_and_goals: 120,
    fears_and_insecurities: 150,
    deep_feelings: 200
};

const UNLOCKABLE_BEHAVIORS: { [key: string]: number } = {
    flirty_banter: 125,
    comfortable_touch: 150,
    pet_names: 175,
    sexual_content: 176,
    deep_intimacy: 200,
    romantic_confession: 225
};

const CONTENT_KEYWORDS = {
    compliments: [
        'beautiful', 'handsome', 'cute', 'pretty', 'gorgeous', 'amazing',
        'wonderful', 'incredible', 'perfect', 'stunning', 'attractive'
    ],
    romantic: [
        'love', 'adore', 'cherish', 'romance', 'romantic', 'kiss', 'date',
        'relationship', 'feelings', 'heart', 'affection'
    ],
    vulnerability: [
        'scared', 'afraid', 'worried', 'insecure', 'anxious', 'fear',
        'vulnerable', 'hurt', 'pain', 'struggling', 'difficult'
    ],
    rude: [
        'stupid', 'idiot', 'dumb', 'shut up', 'hate', 'ugly', 'loser',
        'worthless', 'pathetic', 'annoying'
    ],
    sexual: [
        'sex', 'sexual', 'fuck', 'cock', 'pussy', 'dick', 'naked', 'bed',
        'seduce', 'desire', 'lust', 'aroused', 'explicit', 'arousal'
    ],
    humor: [
        'chuckle', 'giggle', 'grin', 'funny', 'laugh', 'hilarious'
    ]
};

/**
 * ============================================================================
 * MAIN STAGE CLASS
 * ============================================================================
 */
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    private internalState: {
        conversationHistory: Array<{role: string, content: string, timestamp: number}>;
        debugLog: string[];
        currentSessionActive: boolean;
    };

    /**
     * Constructor with all defaults set
     * DEFAULTS: guarded archetype, slow pacing, regression enabled, UI shown, logging off
     */
    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);

        const {config, messageState, chatState, initState} = data;

        // Initialize internal ephemeral state FIRST
        this.internalState = {
            conversationHistory: [],
            debugLog: [],
            currentSessionActive: false
        };

        // Set default config with proper null/undefined handling
        this.config = {
            enableRegression: config?.enableRegression !== undefined ? config.enableRegression : true,
            showProgressUI: config?.showProgressUI !== undefined ? config.showProgressUI : true,
            verboseLogging: config?.verboseLogging !== undefined ? config.verboseLogging : false
        };

        if (!messageState) {
            this.messageState = this.createInitialMessageState();
        }

        if (!chatState) {
            this.chatState = {
                permanentlyUnlockedTopics: [],
                significantEvents: [],
                characterGrowthLevel: 0,
                peakAffection: 0
            };
        }

        if (!initState) {
            this.initState = this.createInitialInitState();
        }

        this.log("Stage constructor completed.");
        this.log(`Defaults: ${this.messageState.characterArchetype} archetype, ${this.messageState.pacingSpeed} pacing`);
    }

    private createInitialMessageState(): MessageStateType {
        return {
            characterArchetype: CharacterArchetype.CONFIDENT,  // DEFAULT
            pacingSpeed: PacingSpeed.FAST,                 // DEFAULT
            affection: 0,
            relationshipStage: RelationshipStage.STRANGERS,
            interactionCount: 0,
            lastInteractionTime: Date.now(),
            emotionalTone: "neutral",
            currentMood: "neutral",
            flags: {
                firstCompliment: false,
                sharedVulnerability: false,
                hadArgument: false,
                metFriends: false,
                firstDateAttempt: false,
                confessedFeelings: false,
                firstPhysicalContact: false
            },
            discussedTopics: [],
            recentConversationSummary: [],
            sessionStartTime: Date.now(),
            messagesThisSession: 0
        };
    }

    private createInitialInitState(): InitStateType {
        return {
            proceduralSeed: `seed-${Date.now()}`,
            chatCreatedAt: Date.now()
        };
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        this.log("Stage load() called");

        const characterCount = Object.keys(this.characters || {}).length;
        if (characterCount === 0) {
            return {
                success: false,
                error: "No characters found. Slow Burn Romance stage requires at least one character.",
                initState: null,
                chatState: null
            };
        }

        if (this.messageState) {
            this.messageState = this.validateAndRepairState(this.messageState);
        }

        this.log(`Stage loaded successfully.`);

        return {
            success: true,
            error: null,
            initState: this.initState,
            chatState: this.chatState
        };
    }

    async setState(state: MessageStateType): Promise<void> {
        this.log("setState() called - swipe detected");

        if (state != null) {
            this.messageState = this.validateAndRepairState(state);
            this.log(`State restored: Affection ${this.messageState.affection}, Stage ${this.messageState.relationshipStage}`);
        }
    }

    /**
     * ========================================================================
     * BEFORE PROMPT - MAIN LOGIC WITH COMMAND DETECTION
     * ========================================================================
     */
    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        const { content } = userMessage;

        this.log(`\n=== BEFORE PROMPT ===`);
        this.log(`User message: "${content.substring(0, 100)}..."`);

        // Check for stage commands FIRST
        const command = this.detectCommand(content);
        if (command) {
            this.log(`Command detected: ${command.type}`);
            const commandResponse = this.handleCommand(command);

            // Return command response without processing as normal message
            return {
                stageDirections: "User is configuring the stage. Do not respond to this message.",
                messageState: this.messageState,
                modifiedMessage: null,
                systemMessage: commandResponse,
                error: null,
                chatState: this.chatState
            };
        }

        // Normal message processing
        this.log(`Current affection: ${this.messageState.affection}`);
        this.log(`Current stage: ${this.messageState.relationshipStage}`);

        this.internalState.conversationHistory.push({
            role: 'user',
            content: content,
            timestamp: Date.now()
        });

        const analysis = this.analyzeUserMessage(content);
        const affectionChange = this.calculateAffectionChange(analysis);

        const pacingMult = PACING_MULTIPLIERS[this.messageState.pacingSpeed];
        const archetypeMult = ARCHETYPE_MULTIPLIERS[this.messageState.characterArchetype];
        const finalChange = Math.round(affectionChange * pacingMult * archetypeMult);

        this.log(`Affection change: ${finalChange}`);

        const previousAffection = this.messageState.affection;
        this.messageState.affection = Math.max(0, Math.min(250, this.messageState.affection + finalChange));

        const boundaryCheck = this.checkBoundaryViolations(analysis, this.messageState.affection);

        const previousStage = this.messageState.relationshipStage;
        this.messageState.relationshipStage = this.determineStage(this.messageState.affection);

        if (previousStage !== this.messageState.relationshipStage) {
            this.log(`⭐ STAGE CHANGE: ${previousStage} → ${this.messageState.relationshipStage}`);

            this.chatState.significantEvents.push({
                event: `stage_change_to_${this.messageState.relationshipStage}`,
                timestamp: Date.now(),
                affectionAtTime: this.messageState.affection
            });
        }

        this.messageState.interactionCount++;
        this.messageState.messagesThisSession++;
        this.messageState.lastInteractionTime = Date.now();

        if (this.messageState.affection > this.chatState.peakAffection) {
            this.chatState.peakAffection = this.messageState.affection;
        }

        const stageDirections = this.generateStageDirections(
            this.messageState.relationshipStage,
            this.messageState.affection,
            this.messageState.characterArchetype,
            boundaryCheck.violations.length > 0
        );

        return {
            stageDirections: stageDirections,
            messageState: this.messageState,
            modifiedMessage: null,
            systemMessage: boundaryCheck.violations.length > 0 ?
                `[The character gently redirects the conversation, not ready for that yet]` : null,
            error: null,
            chatState: this.chatState
        };
    }

    /**
     * ========================================================================
     * AFTER RESPONSE
     * ========================================================================
     */
    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        const { content } = botMessage;

        this.log(`\n=== AFTER RESPONSE ===`);

        this.internalState.conversationHistory.push({
            role: 'bot',
            content: content,
            timestamp: Date.now()
        });

        const botAnalysis = this.analyzeBotMessage(content);
        const consistencyCheck = this.checkBotConsistency(
            content,
            this.messageState.relationshipStage,
            this.messageState.affection
        );

        let modifiedMessage: string | null = null;
        let correctionDirections: string | null = null;

        if (!consistencyCheck.appropriate) {
            this.log(`⚠️ Bot behavior inconsistent with stage!`);
            modifiedMessage = this.rewriteBotMessage(content, this.messageState.relationshipStage);
            correctionDirections = this.generateCorrectionDirections(consistencyCheck.reasons);
        }

        const emotionalMoments = this.detectEmotionalMoments(content, botAnalysis);

        let bonusAffection = 0;
        if (emotionalMoments.length > 0) {
            bonusAffection = 2;
        }

        let updatedState = { ...this.messageState };
        if (bonusAffection > 0) {
            updatedState.affection = Math.min(250, updatedState.affection + bonusAffection);
        }

        let systemMessage: string | null = null;
        if (emotionalMoments.length > 0) {
            systemMessage = `[${emotionalMoments[0]}]`;
        }

        return {
            stageDirections: correctionDirections,
            messageState: updatedState,
            modifiedMessage: modifiedMessage,
            systemMessage: systemMessage,
            error: null,
            chatState: null
        };
    }

    /**
     * ========================================================================
     * ANALYSIS METHODS (ABBREVIATED FOR BREVITY)
     * ========================================================================
     */

    private analyzeUserMessage(content: string): any {
        const lowerContent = content.toLowerCase();
        return {
            hasCompliment: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.compliments),
            hasRomanticIntent: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.romantic),
            hasVulnerability: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.vulnerability),
            isRude: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.rude),
            hasSexualContent: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.sexual),
            hasHumor: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.humor),
            asksAboutCharacter: this.detectsQuestionPattern(content),
            referencesHistory: this.detectsHistoricalReference(content),
            isShort: content.length < 20,
            isThoughtful: content.length > 100 && !this.containsKeywords(lowerContent, CONTENT_KEYWORDS.rude),
            wordCount: content.split(' ').length
        };
    }

    private analyzeBotMessage(content: string): any {
        const lowerContent = content.toLowerCase();
        return {
            hasRomanticLanguage: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.romantic),
            hasSexualContent: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.sexual),
            isFlirty: this.detectsFlirtation(content),
            showsVulnerability: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.vulnerability),
            usesTouchDescriptions: this.detectsTouchDescriptions(content),
            length: content.length
        };
    }

    private containsKeywords(text: string, keywords: string[]): boolean {
        return keywords.some(keyword => text.includes(keyword));
    }

    private detectsQuestionPattern(text: string): boolean {
        const questionWords = ['what', 'who', 'where', 'when', 'why', 'how', 'tell me', 'can you'];
        const lowerText = text.toLowerCase();
        return questionWords.some(word => lowerText.includes(word)) && text.includes('?');
    }

    private detectsHistoricalReference(text: string): boolean {
        const historyWords = ['remember', 'earlier', 'before', 'yesterday', 'last time', 'you said', 'we talked'];
        const lowerText = text.toLowerCase();
        return historyWords.some(word => lowerText.includes(word));
    }

    private detectsFlirtation(text: string): boolean {
        const flirtyPatterns = ['wink', 'smirk', 'tease', 'playful', 'coy', 'flirt'];
        const lowerText = text.toLowerCase();
        return flirtyPatterns.some(pattern => lowerText.includes(pattern));
    }

    private detectsTouchDescriptions(text: string): boolean {
        const touchWords = ['touch', 'hand', 'hold', 'caress', 'stroke', 'embrace', 'hug'];
        const lowerText = text.toLowerCase();
        return touchWords.some(word => lowerText.includes(word));
    }

    private calculateAffectionChange(analysis: any): number {
        let change = 0;

        change += AFFECTION_GAINS.base_message;

        if (analysis.hasCompliment) {
            change += AFFECTION_GAINS.compliment;
        }

        if (analysis.asksAboutCharacter) {
            change += AFFECTION_GAINS.asking_about_character;
        }

        if (analysis.referencesHistory) {
            change += AFFECTION_GAINS.remembering_conversation;
        }

        if (analysis.hasVulnerability) {
            change += AFFECTION_GAINS.emotional_vulnerability;
        }

        if (analysis.hasHumor) {
            change += AFFECTION_GAINS.making_laugh;
        }

        if (analysis.isThoughtful) {
            change += AFFECTION_GAINS.thoughtful_message;
        }

        const timeSinceStart = Date.now() - this.messageState.sessionStartTime;
        const minutesActive = Math.floor(timeSinceStart / (5 * 60 * 1000));
        if (minutesActive > 0) {
            const timeBonus = Math.min(minutesActive * AFFECTION_GAINS.time_bonus_per_5min, 10);
            change += timeBonus;
        }

        if (analysis.isRude) {
            const penalty = this.config.enableRegression ?
                AFFECTION_LOSSES.rude_behavior * REGRESSION_MULTIPLIER :
                AFFECTION_LOSSES.rude_behavior;
            change += penalty;
        }

        if (analysis.hasSexualContent && this.messageState.affection < UNLOCKABLE_BEHAVIORS.sexual_content) {
            const penalty = this.config.enableRegression ?
                AFFECTION_LOSSES.pushing_boundaries * REGRESSION_MULTIPLIER :
                AFFECTION_LOSSES.pushing_boundaries;
            change += penalty;
        }

        if (analysis.isShort && this.messageState.messagesThisSession > 3) {
            change += AFFECTION_LOSSES.short_disengaged_message;
        }

        return change;
    }

    private determineStage(affection: number): RelationshipStage {
        if (affection >= STAGE_THRESHOLDS[RelationshipStage.ROMANCE]) return RelationshipStage.ROMANCE;
        if (affection >= STAGE_THRESHOLDS[RelationshipStage.ROMANTIC_TENSION]) return RelationshipStage.ROMANTIC_TENSION;
        if (affection >= STAGE_THRESHOLDS[RelationshipStage.CLOSE_FRIENDS]) return RelationshipStage.CLOSE_FRIENDS;
        if (affection >= STAGE_THRESHOLDS[RelationshipStage.GOOD_FRIENDS]) return RelationshipStage.GOOD_FRIENDS;
        if (affection >= STAGE_THRESHOLDS[RelationshipStage.FRIENDS]) return RelationshipStage.FRIENDS;
        if (affection >= STAGE_THRESHOLDS[RelationshipStage.ACQUAINTANCES]) return RelationshipStage.ACQUAINTANCES;
        return RelationshipStage.STRANGERS;
    }

    private checkBoundaryViolations(analysis: any, currentAffection: number): any {
        const violations: string[] = [];

        if (analysis.hasSexualContent && currentAffection < UNLOCKABLE_BEHAVIORS.sexual_content) {
            violations.push("sexual_content_too_early");
        }

        if (analysis.hasRomanticIntent && currentAffection < UNLOCKABLE_BEHAVIORS.flirty_banter) {
            violations.push("romantic_too_early");
        }

        return { violations: violations, hardBoundariesViolated: [] };
    }

    private checkBotConsistency(content: string, stage: RelationshipStage, affection: number): any {
        const reasons: string[] = [];
        const lowerContent = content.toLowerCase();

        if (affection < UNLOCKABLE_BEHAVIORS.sexual_content) {
            if (this.containsKeywords(lowerContent, CONTENT_KEYWORDS.sexual)) {
                reasons.push("sexual_content_too_early");
            }
        }

        if (affection < UNLOCKABLE_BEHAVIORS.flirty_banter) {
            if (this.detectsFlirtation(content)) {
                reasons.push("flirtation_too_early");
            }
        }

        if (affection < UNLOCKABLE_BEHAVIORS.comfortable_touch) {
            if (this.detectsTouchDescriptions(content)) {
                reasons.push("touch_too_early");
            }
        }

        return { appropriate: reasons.length === 0, reasons: reasons };
    }

    private rewriteBotMessage(content: string, stage: RelationshipStage): string {
        let rewritten = content;
        CONTENT_KEYWORDS.sexual.forEach(word => {
            const regex = new RegExp(word, 'gi');
            rewritten = rewritten.replace(regex, '...');
        });
        return rewritten;
    }

    private generateStageDirections(
        stage: RelationshipStage,
        affection: number,
        archetype: CharacterArchetype,
        boundaryViolated: boolean
    ): string {
        let directions: string[] = [];

        directions.push(this.getStageSpecificDirections(stage, affection));
        directions.push(this.getArchetypeSpecificDirections(archetype, stage));

        if (boundaryViolated) {
            directions.push("User is moving too fast. Politely deflect or redirect the conversation.");
        }

        const unlockedBehaviors = this.getUnlockedBehaviors(affection);
        if (unlockedBehaviors.length > 0) {
            directions.push(`Unlocked behaviors: ${unlockedBehaviors.join(', ')}`);
        }

        return directions.join(' ');
    }

    private getStageSpecificDirections(stage: RelationshipStage, affection: number): string {
        const directions: { [key in RelationshipStage]: string } = {
            [RelationshipStage.STRANGERS]: "You've just met. Be polite but distant. Don't share personal information.",
            [RelationshipStage.ACQUAINTANCES]: "You're warming up slightly. Show cautious interest. Be friendly but maintain emotional distance.",
            [RelationshipStage.FRIENDS]: "You're comfortable talking. Share some opinions and interests. Be more relaxed and open.",
            [RelationshipStage.GOOD_FRIENDS]: "You trust them. Share more personal thoughts and feelings. Be supportive and engaged.",
            [RelationshipStage.CLOSE_FRIENDS]: "You're very close. Share vulnerabilities and deep thoughts. Be emotionally available.",
            [RelationshipStage.ROMANTIC_TENSION]: "There's clear attraction. Allow flirtation and romantic subtext. Build tension.",
            [RelationshipStage.ROMANCE]: "You're in a romantic relationship. Express love and affection openly."
        };
        return directions[stage];
    }

    private getArchetypeSpecificDirections(archetype: CharacterArchetype, stage: RelationshipStage): string {
        const directions: { [key in CharacterArchetype]: string } = {
            [CharacterArchetype.TSUNDERE]: "Deflect compliments with denial or irritation. Mask your growing feelings with sharp words.",
            [CharacterArchetype.SHY]: "Get flustered easily. Stammer or blush when complimented. Need encouragement to open up.",
            [CharacterArchetype.CONFIDENT]: "Be direct and clear about your feelings. Don't play games. Communicate openly.",
            [CharacterArchetype.GUARDED]: "Show trust issues. Need consistency and patience. Test their intentions. Slowly lower your walls."
        };
        return directions[archetype];
    }

    private getUnlockedBehaviors(affection: number): string[] {
        const unlocked: string[] = [];
        for (const [behavior, threshold] of Object.entries(UNLOCKABLE_BEHAVIORS)) {
            if (affection >= threshold) {
                unlocked.push(behavior.replace('_', ' '));
            }
        }
        return unlocked;
    }

    private generateCorrectionDirections(reasons: string[]): string {
        return "Your previous response was too forward for the current relationship stage. Reasons: " + reasons.join(', ');
    }

    private detectEmotionalMoments(content: string, analysis: any): string[] {
        const moments: string[] = [];

        if (analysis.showsVulnerability) {
            moments.push("Character shared something vulnerable");
        }

        if (analysis.hasRomanticLanguage && this.messageState.affection >= UNLOCKABLE_BEHAVIORS.flirty_banter) {
            moments.push("Romantic feelings acknowledged");
        }

        if (analysis.usesTouchDescriptions && this.messageState.affection >= UNLOCKABLE_BEHAVIORS.comfortable_touch) {
            moments.push("Physical affection expressed");
        }

        return moments;
    }

    private validateAndRepairState(state: MessageStateType): MessageStateType {
        const repaired = { ...state };

        if (repaired.affection < 0) repaired.affection = 0;
        if (repaired.affection > 250) repaired.affection = 250;

        const correctStage = this.determineStage(repaired.affection);
        if (repaired.relationshipStage !== correctStage) {
            repaired.relationshipStage = correctStage;
        }

        if (!repaired.characterArchetype || !Object.values(CharacterArchetype).includes(repaired.characterArchetype)) {
            repaired.characterArchetype = CharacterArchetype.GUARDED;
        }

        if (!repaired.pacingSpeed || !Object.values(PacingSpeed).includes(repaired.pacingSpeed)) {
            repaired.pacingSpeed = PacingSpeed.SLOW;
        }

        if (!repaired.flags) {
            repaired.flags = {
                firstCompliment: false,
                sharedVulnerability: false,
                hadArgument: false,
                metFriends: false,
                firstDateAttempt: false,
                confessedFeelings: false,
                firstPhysicalContact: false
            };
        }

        if (!repaired.discussedTopics) repaired.discussedTopics = [];
        if (!repaired.recentConversationSummary) repaired.recentConversationSummary = [];

        return repaired;
    }

    private log(message: string): void {
        if (this.config && this.config.verboseLogging) {
            console.log(`[SlowBurnRomance] ${message}`);
        }

        // Always store in internal log for debugging
        if (this.internalState && this.internalState.debugLog) {
            this.internalState.debugLog.push(message);

            // Keep log bounded
            if (this.internalState.debugLog.length > 100) {
                this.internalState.debugLog.shift();
            }
        }
    }

    /**
     * ========================================================================
     * RENDER METHOD
     * ========================================================================
     */
    render(): ReactElement | null {
        if (!this.config || !this.messageState || !this.initState) {
            return null;
        }

        if (!this.config.showProgressUI) {
            return null;
        }

        const { affection, relationshipStage, characterArchetype, pacingSpeed } = this.messageState;

        const stageKeys = Object.keys(STAGE_THRESHOLDS) as RelationshipStage[];
        const currentStageIndex = stageKeys.indexOf(relationshipStage);
        const currentStageMin = STAGE_THRESHOLDS[relationshipStage];
        const nextStageMin = currentStageIndex < stageKeys.length - 1 ?
            STAGE_THRESHOLDS[stageKeys[currentStageIndex + 1]] : 250;

        const stageProgress = ((affection - currentStageMin) / (nextStageMin - currentStageMin)) * 100;

        const unlockedBehaviors = Object.keys(UNLOCKABLE_BEHAVIORS).filter(
            behavior => affection >= UNLOCKABLE_BEHAVIORS[behavior]
        );

        const combinedMultiplier = (ARCHETYPE_MULTIPLIERS[characterArchetype] * PACING_MULTIPLIERS[pacingSpeed]).toFixed(2);

        return (
            <div style={{
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '14px',
                maxWidth: '300px'
            }}>
                <div style={{ marginBottom: '16px' }}>
                    <div style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#212529',
                        marginBottom: '8px'
                    }}>
                        Relationship Progress
                    </div>
                    <div style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        marginBottom: '12px'
                    }}>
                        Stage: {relationshipStage.replace('_', ' ').toUpperCase()}
                    </div>

                    <div style={{
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px',
                        height: '24px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${(affection / 250) * 100}%`,
                            backgroundColor: this.getProgressColor(relationshipStage),
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
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            {affection} / 250
                        </div>
                    </div>

                    <div style={{
                        marginTop: '8px',
                        fontSize: '11px',
                        color: '#6c757d'
                    }}>
                        Stage progress: {Math.round(stageProgress)}%
                    </div>
                </div>

                <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #dee2e6'
                }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#495057',
                        marginBottom: '6px'
                    }}>
                        Settings:
                    </div>
                    <div style={{
                        fontSize: '11px',
                        color: '#6c757d',
                        lineHeight: '1.5'
                    }}>
                        <div>{characterArchetype.toUpperCase()} archetype</div>
                        <div>{pacingSpeed.toUpperCase()} pacing</div>
                        <div>Combined: {combinedMultiplier}× speed</div>
                    </div>
                </div>

                {unlockedBehaviors.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#495057',
                            marginBottom: '6px'
                        }}>
                            Unlocked:
                        </div>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px'
                        }}>
                            {unlockedBehaviors.slice(-3).map(behavior => (
                                <span key={behavior} style={{
                                    padding: '2px 8px',
                                    backgroundColor: '#d3f9d8',
                                    color: '#2b8a3e',
                                    borderRadius: '12px',
                                    fontSize: '10px'
                                }}>
                                    {behavior.replace('_', ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    private getProgressColor(stage: RelationshipStage): string {
        const colors: { [key in RelationshipStage]: string } = {
            [RelationshipStage.STRANGERS]: '#868e96',
            [RelationshipStage.ACQUAINTANCES]: '#74c0fc',
            [RelationshipStage.FRIENDS]: '#51cf66',
            [RelationshipStage.GOOD_FRIENDS]: '#69db7c',
            [RelationshipStage.CLOSE_FRIENDS]: '#ffd43b',
            [RelationshipStage.ROMANTIC_TENSION]: '#ff8787',
            [RelationshipStage.ROMANCE]: '#ff6b6b'
        };
        return colors[stage];
    }
}