/**
 * ============================================================================
 * SLOW BURN ROMANCE STAGE - OPTIMIZED
 * ============================================================================
 * A comprehensive romance progression system for LLM character bots
 *
 * Features:
 * - 7 relationship stages (Strangers → Romance)
 * - Affection system (0-250 scale)
 * - 4 character archetypes (affects progression speed)
 * - 4 pacing speeds (affects progression speed)
 * - Topic unlocking system based on affection
 * - Content unlocking system
 * - Boundary enforcement
 * - Visual progress UI
 *
 * Defaults:
 * - Character Archetype: CONFIDENT (1.0× multiplier)
 * - Pacing Speed: FAST (1.5× multiplier)
 * - Combined speed: 1.5× (~167 messages to max)
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
    CONFIDENT = "confident",
    GUARDED = "guarded"
}

/**
 * Pacing speed multiplier
 */
enum PacingSpeed {
    GLACIAL = "glacial",
    SLOW = "slow",
    MODERATE = "moderate",
    FAST = "fast"
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
    chatCreatedAt: number;
};

/**
 * Message state - streamlined to only essential fields
 */
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
 * User message analysis result
 */
interface MessageAnalysis {
    hasCompliment: boolean;
    hasRomanticIntent: boolean;
    hasVulnerability: boolean;
    isRude: boolean;
    hasSexualContent: boolean;
    hasHumor: boolean;
    asksAboutCharacter: boolean;
    isThoughtful: boolean;
}

/**
 * Bot message analysis result
 */
interface BotAnalysis {
    hasRomanticLanguage: boolean;
    hasSexualContent: boolean;
    isFlirty: boolean;
    showsVulnerability: boolean;
    usesTouchDescriptions: boolean;
}

/**
 * Boundary violation check result
 */
interface BoundaryCheck {
    violations: string[];
}

/**
 * Bot consistency check result
 */
interface ConsistencyCheck {
    appropriate: boolean;
    reasons: string[];
}

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
    emotional_vulnerability: 10,
    making_laugh: 5,
    time_bonus_per_5min: 2,
    thoughtful_message: 3
};

const AFFECTION_LOSSES = {
    rude_behavior: -10,
    pushing_boundaries: -15
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
    flirty_banter: 80,
    comfortable_touch: 120,
    pet_names: 75,
    sexual_content: 155,
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
    // Explicit property declarations for build compatibility
    declare config: ConfigType;
    declare messageState: MessageStateType;
    declare chatState: ChatStateType;
    declare initState: InitStateType;
    declare characters: any;

    /**
     * Constructor with defaults
     * DEFAULTS: CONFIDENT archetype, FAST pacing, regression enabled, UI shown, logging off
     */
    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);

        const {config, messageState, chatState, initState} = data;

        // Set default config with proper null/undefined handling
        this.config = {
            enableRegression: config?.enableRegression !== undefined ? config.enableRegression : true,
            showProgressUI: config?.showProgressUI !== undefined ? config.showProgressUI : true,
            verboseLogging: config?.verboseLogging !== undefined ? config.verboseLogging : false
        };

        // FIXED: Ensure archetype and pacing are always set, even if messageState exists
        if (!messageState) {
            this.messageState = this.createInitialMessageState();
        } else {
            // Validate and repair existing state to ensure archetype/pacing are set
            this.messageState = this.validateAndRepairState(messageState);
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

    private createInitialInitState(): InitStateType {
        return {
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
     * BEFORE PROMPT - MAIN LOGIC
     * ========================================================================
     */
    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        const { content } = userMessage;

        this.log(`\n=== BEFORE PROMPT ===`);
        this.log(`User message: "${content.substring(0, 100)}..."`);
        this.log(`Current affection: ${this.messageState.affection}`);
        this.log(`Current stage: ${this.messageState.relationshipStage}`);

        // Analyze message
        const analysis = this.analyzeUserMessage(content);
        const affectionChange = this.calculateAffectionChange(analysis);

        // Apply multipliers
        const pacingMult = PACING_MULTIPLIERS[this.messageState.pacingSpeed];
        const archetypeMult = ARCHETYPE_MULTIPLIERS[this.messageState.characterArchetype];
        const finalChange = Math.round(affectionChange * pacingMult * archetypeMult);

        this.log(`Affection change: ${finalChange}`);

        // Update affection
        this.messageState.affection = Math.max(0, Math.min(250, this.messageState.affection + finalChange));

        // Check boundaries
        const boundaryCheck = this.checkBoundaryViolations(analysis, this.messageState.affection);

        // Update stage
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

        // Update counters
        this.messageState.interactionCount++;
        this.messageState.messagesThisSession++;
        this.messageState.lastInteractionTime = Date.now();

        // Track peak affection
        if (this.messageState.affection > this.chatState.peakAffection) {
            this.chatState.peakAffection = this.messageState.affection;
        }

        // Check and unlock topics based on affection
        this.checkAndUnlockTopics();

        // Update character growth based on interactions
        this.updateCharacterGrowth();

        // Generate stage directions
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
            correctionDirections = this.generateCorrectionDirections(consistencyCheck.reasons);
        }

        // Check for emotional moments and award bonus affection
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
     * ANALYSIS METHODS
     * ========================================================================
     */

    private analyzeUserMessage(content: string): MessageAnalysis {
        const lowerContent = content.toLowerCase();
        return {
            hasCompliment: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.compliments),
            hasRomanticIntent: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.romantic),
            hasVulnerability: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.vulnerability),
            isRude: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.rude),
            hasSexualContent: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.sexual),
            hasHumor: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.humor),
            asksAboutCharacter: this.asksAboutCharacter(lowerContent),
            isThoughtful: content.length > 100 && content.includes('?')
        };
    }

    private analyzeBotMessage(content: string): BotAnalysis {
        const lowerContent = content.toLowerCase();
        return {
            hasRomanticLanguage: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.romantic),
            hasSexualContent: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.sexual),
            isFlirty: this.detectsFlirtation(content),
            showsVulnerability: this.containsKeywords(lowerContent, CONTENT_KEYWORDS.vulnerability),
            usesTouchDescriptions: this.detectsTouchDescriptions(content)
        };
    }

    private containsKeywords(text: string, keywords: string[]): boolean {
        return keywords.some(keyword => text.includes(keyword));
    }

    private asksAboutCharacter(text: string): boolean {
        const characterQuestions = [
            'what do you', 'how do you feel', 'tell me about',
            'what are you', 'who are you', 'what\'s your'
        ];
        return characterQuestions.some(phrase => text.includes(phrase));
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

    private calculateAffectionChange(analysis: MessageAnalysis): number {
        let change = 0;

        // Base gain
        change += AFFECTION_GAINS.base_message;

        // Positive behaviors
        if (analysis.hasCompliment) {
            change += AFFECTION_GAINS.compliment;
        }

        if (analysis.asksAboutCharacter) {
            change += AFFECTION_GAINS.asking_about_character;
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

        // Time bonus
        const timeSinceStart = Date.now() - this.messageState.sessionStartTime;
        const minutesActive = Math.floor(timeSinceStart / (5 * 60 * 1000));
        if (minutesActive > 0) {
            const timeBonus = Math.min(minutesActive * AFFECTION_GAINS.time_bonus_per_5min, 10);
            change += timeBonus;
        }

        // Negative behaviors
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

        return change;
    }

    private checkBoundaryViolations(analysis: MessageAnalysis, affection: number): BoundaryCheck {
        const violations: string[] = [];

        if (analysis.hasRomanticIntent && affection < UNLOCKABLE_BEHAVIORS.flirty_banter) {
            violations.push("romantic_intent_too_early");
        }

        if (analysis.hasSexualContent && affection < UNLOCKABLE_BEHAVIORS.sexual_content) {
            violations.push("sexual_content_too_early");
        }

        return { violations };
    }

    private checkBotConsistency(
        content: string,
        stage: RelationshipStage,
        affection: number
    ): ConsistencyCheck {
        const analysis = this.analyzeBotMessage(content);
        const reasons: string[] = [];

        // Check for inappropriate romantic content
        if (analysis.hasRomanticLanguage && affection < UNLOCKABLE_BEHAVIORS.flirty_banter) {
            reasons.push("expressing romantic feelings too early");
        }

        // Check for inappropriate sexual content
        if (analysis.hasSexualContent && affection < UNLOCKABLE_BEHAVIORS.sexual_content) {
            reasons.push("including sexual content before unlocked");
        }

        // Check for inappropriate physical touch
        if (analysis.usesTouchDescriptions && affection < UNLOCKABLE_BEHAVIORS.comfortable_touch) {
            reasons.push("describing physical touch too early");
        }

        return {
            appropriate: reasons.length === 0,
            reasons: reasons
        };
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

    /**
     * ========================================================================
     * TOPIC UNLOCKING
     * ========================================================================
     */

    private checkAndUnlockTopics(): void {
        for (const [topic, threshold] of Object.entries(UNLOCKABLE_TOPICS)) {
            if (this.messageState.affection >= threshold &&
                !this.chatState.permanentlyUnlockedTopics.includes(topic)) {
                this.chatState.permanentlyUnlockedTopics.push(topic);
                this.log(`🔓 Unlocked topic: ${topic}`);
            }
        }
    }

    /**
     * ========================================================================
     * CHARACTER GROWTH
     * ========================================================================
     */

    private updateCharacterGrowth(): void {
        // Max growth level is 100
        const eventsCount = this.chatState.significantEvents.length;
        const stageMultiplier = this.getStageMultiplier(this.messageState.relationshipStage);

        // Growth formula: (events * 2 + stage_bonus) capped at 100
        const calculatedGrowth = Math.min(100, (eventsCount * 2) + stageMultiplier);

        if (calculatedGrowth > this.chatState.characterGrowthLevel) {
            this.chatState.characterGrowthLevel = calculatedGrowth;
            this.log(`📈 Character growth: ${this.chatState.characterGrowthLevel}/100`);
        }
    }

    private getStageMultiplier(stage: RelationshipStage): number {
        const multipliers: { [key in RelationshipStage]: number } = {
            [RelationshipStage.STRANGERS]: 0,
            [RelationshipStage.ACQUAINTANCES]: 5,
            [RelationshipStage.FRIENDS]: 10,
            [RelationshipStage.GOOD_FRIENDS]: 15,
            [RelationshipStage.CLOSE_FRIENDS]: 20,
            [RelationshipStage.ROMANTIC_TENSION]: 25,
            [RelationshipStage.ROMANCE]: 30
        };
        return multipliers[stage];
    }

    /**
     * ========================================================================
     * STAGE DIRECTION GENERATION
     * ========================================================================
     */

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

        // Add unlocked topics to directions
        const unlockedTopics = this.getUnlockedTopicsForDirections();
        if (unlockedTopics.length > 0) {
            directions.push(`Topics you can discuss openly: ${unlockedTopics.join(', ')}`);
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

    private getUnlockedTopicsForDirections(): string[] {
        return this.chatState.permanentlyUnlockedTopics.map(topic =>
            topic.replace('_', ' ')
        );
    }

    private generateCorrectionDirections(reasons: string[]): string {
        return "Your previous response was too forward for the current relationship stage. Reasons: " + reasons.join(', ');
    }

    private detectEmotionalMoments(content: string, analysis: BotAnalysis): string[] {
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

    /**
     * ========================================================================
     * STATE VALIDATION
     * ========================================================================
     */

    private validateAndRepairState(state: MessageStateType): MessageStateType {
        const repaired = { ...state };

        // Validate affection bounds
        if (repaired.affection < 0) repaired.affection = 0;
        if (repaired.affection > 250) repaired.affection = 250;

        // Ensure stage matches affection
        const correctStage = this.determineStage(repaired.affection);
        if (repaired.relationshipStage !== correctStage) {
            repaired.relationshipStage = correctStage;
        }

        // FIXED: Validate archetype - ensure it's always set
        if (!repaired.characterArchetype || !Object.values(CharacterArchetype).includes(repaired.characterArchetype)) {
            repaired.characterArchetype = CharacterArchetype.CONFIDENT;
            this.log("⚠️ Archetype was missing or invalid, reset to CONFIDENT");
        }

        // FIXED: Validate pacing - ensure it's always set
        if (!repaired.pacingSpeed || !Object.values(PacingSpeed).includes(repaired.pacingSpeed)) {
            repaired.pacingSpeed = PacingSpeed.FAST;
            this.log("⚠️ Pacing was missing or invalid, reset to FAST");
        }

        return repaired;
    }

    /**
     * ========================================================================
     * LOGGING
     * ========================================================================
     */

    private log(message: string): void {
        if (this.config && this.config.verboseLogging) {
            console.log(`[SlowBurnRomance] ${message}`);
        }
    }

    /**
     * ========================================================================
     * RENDER METHOD - FIXED VERSION
     * ========================================================================
     */
    render(): ReactElement {
        if (!this.config || !this.messageState || !this.initState) {
            return <></>;
        }

        if (!this.config.showProgressUI) {
            return <></>;
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

        const unlockedTopics = this.chatState.permanentlyUnlockedTopics;

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

                    {/* Affection bar */}
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

                {/* Settings - FIXED: Removed Character Growth */}
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
                        {/* REMOVED: Character Growth line */}
                    </div>
                </div>

                {/* Unlocked behaviors */}
                {unlockedBehaviors.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#495057',
                            marginBottom: '6px'
                        }}>
                            Unlocked Behaviors:
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

                {/* Unlocked topics */}
                {unlockedTopics.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#495057',
                            marginBottom: '6px'
                        }}>
                            Unlocked Topics:
                        </div>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px'
                        }}>
                            {unlockedTopics.map(topic => (
                                <span key={topic} style={{
                                    padding: '2px 8px',
                                    backgroundColor: '#e7f5ff',
                                    color: '#1971c2',
                                    borderRadius: '12px',
                                    fontSize: '10px'
                                }}>
                                    {topic.replace('_', ' ')}
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
