import {Stage} from "./Stage";
import {useEffect, useState} from "react";
import {StageBase, InitialData, DEFAULT_INITIAL} from "@chub-ai/stages-ts";

// Test data - modify this to test different scenarios
const TEST_DATA = {
    ...DEFAULT_INITIAL,
    characters: {
        "char1": {
            name: "Test Character",
            id: "char1",
            avatar: "",
            description: "A test character for development"
        }
    },
    users: {
        "user1": {
            name: "Test User",
            id: "user1"
        }
    }
};

export interface TestStageRunnerProps<StageType extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType>,
    InitStateType, ChatStateType, MessageStateType, ConfigType> {
    factory: (data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) => StageType;
}

export const TestStageRunner = <StageType extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType>,
    InitStateType, ChatStateType, MessageStateType, ConfigType>({ factory }: TestStageRunnerProps<StageType, InitStateType, ChatStateType, MessageStateType, ConfigType>) => {

    // @ts-ignore
    const [stage, _setStage] = useState(() => new Stage(TEST_DATA));
    const [node, setNode] = useState(new Date());

    function refresh() {
        setNode(new Date());
    }

    async function delayedTest(test: any, delaySeconds: number) {
        await new Promise(f => setTimeout(f, delaySeconds * 1000));
        return test();
    }

    async function runTests() {
        console.log("=== TEST RUNNER ===");
        console.log("Stage loaded. You can test commands here:");
        console.log("1. Type ((stage options)) to see configuration");
        console.log("2. Type ((stage status)) to see progress");
        console.log("3. Type ((set archetype confident)) to change archetype");
        console.log("4. Type ((set pacing fast)) to change pacing");

        // You can add automated tests here if needed
        // For example:
        /*
        const testMessage = {
            anonymizedId: "user1",
            content: "Hello! You're looking great today.",
            isBot: false,
            promptForId: null
        };

        console.log("\nTesting message:", testMessage.content);
        const result = await stage.beforePrompt(testMessage);
        console.log("Result:", result);
        refresh();
        */
    }

    useEffect(() => {
        stage.load().then((res) => {
            console.info(`Test Stage Runner load success: ${res.success}`);
            if(!res.success || res.error != null) {
                console.error(`Error from stage during load: ${res.error}`);
            } else {
                runTests().then(() => console.info("Test runner initialized."));
            }
        });
    }, []);

    return <>
        <div style={{display: 'none'}}>{String(node)}</div>
        {stage == null ? (
            <div style={{padding: '20px'}}>
                Stage loading...
            </div>
        ) : (
            <div style={{
                display: 'flex',
                height: '100vh',
                backgroundColor: '#1a1a1a'
            }}>
                {/* Stage UI on the left */}
                <div style={{
                    width: '300px',
                    borderRight: '1px solid #333',
                    overflowY: 'auto'
                }}>
                    {stage.render()}
                </div>

                {/* Test info on the right */}
                <div style={{
                    flex: 1,
                    padding: '20px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    overflowY: 'auto'
                }}>
                    <h1 style={{marginTop: 0}}>Slow Burn Romance - Test Mode</h1>

                    <h2>Current Status</h2>
                    <div style={{
                        backgroundColor: '#2a2a2a',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <div>Affection: {stage.messageState?.affection || 0} / 250</div>
                        <div>Stage: {stage.messageState?.relationshipStage || 'unknown'}</div>
                        <div>Archetype: {stage.messageState?.characterArchetype || 'unknown'}</div>
                        <div>Pacing: {stage.messageState?.pacingSpeed || 'unknown'}</div>
                    </div>

                    <h2>Test Commands</h2>
                    <div style={{
                        backgroundColor: '#2a2a2a',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <p>To test in a real chat, these commands work:</p>
                        <ul style={{listStyle: 'none', padding: 0}}>
                            <li>→ <code>((stage options))</code></li>
                            <li>→ <code>((stage status))</code></li>
                            <li>→ <code>((set archetype confident))</code></li>
                            <li>→ <code>((set pacing fast))</code></li>
                            <li>→ <code>((stage help))</code></li>
                        </ul>
                    </div>

                    <h2>Browser Console</h2>
                    <div style={{
                        backgroundColor: '#2a2a2a',
                        padding: '15px',
                        borderRadius: '8px'
                    }}>
                        <p>Open browser console (F12) to see detailed logs.</p>
                        <p>Enable verbose logging in chub_meta.yaml if you want to see all stage activity.</p>
                    </div>

                    <h2>Next Steps</h2>
                    <div style={{
                        backgroundColor: '#2a2a2a',
                        padding: '15px',
                        borderRadius: '8px',
                        marginTop: '20px'
                    }}>
                        <ol>
                            <li>Check that Stage UI renders on the left</li>
                            <li>Verify default settings (GUARDED + SLOW)</li>
                            <li>Look for console logs confirming stage loaded</li>
                            <li>If all looks good, deploy to Chub!</li>
                        </ol>
                        <p style={{marginTop: '15px', color: '#888'}}>
                            Note: The iframe transport error is normal in local dev and can be ignored.
                        </p>
                    </div>
                </div>
            </div>
        )}
    </>;
};