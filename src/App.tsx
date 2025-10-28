import {ReactRunner} from "@chub-ai/stages-ts";
import {Stage} from "./Stage";
import {TestStageRunner} from "./TestRunner";
import type {InitialData} from "@chub-ai/stages-ts";

// Import the type definitions from Stage
type InitStateType = {
    chatCreatedAt: number;
};

type MessageStateType = {
    characterArchetype: string;
    pacingSpeed: string;
    affection: number;
    relationshipStage: string;
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

type ConfigType = {
    enableRegression: boolean;
    showProgressUI: boolean;
    verboseLogging: boolean;
};

function App() {
  const isDev = import.meta.env.DEV;
  console.info(`Running in ${import.meta.env.MODE}`);

  return isDev ? 
      <TestStageRunner factory={(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) => new Stage(data)} /> :
      <ReactRunner factory={(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) => new Stage(data)} />;
}

export default App
