import {ReactRunner} from "@chub-ai/stages-ts";
import {Stage} from "./Stage";
import {TestStageRunner} from "./TestRunner";

function App() {
  const isDev = import.meta.env.DEV;
  console.info(`Running in ${import.meta.env.MODE}`);

  return isDev ? 
      <TestStageRunner factory={(data: any) => new Stage(data as any)} /> :
      <ReactRunner factory={(data: any) => new Stage(data as any)} />;
}

export default App