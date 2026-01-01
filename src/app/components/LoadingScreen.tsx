import { Dispatch } from "react";

interface props {
    setUserIsConnected: Dispatch<boolean>,
}

function LoadingScreen(props: props){
    function connect() {
        props.setUserIsConnected(true);
    }
    return (
        <div className="flex flex-col w-full h-screen justify-center items-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="panel w-full max-w-md" style={{ backgroundColor: 'var(--bg-secondary-solid)' }}>
                <div className="flex flex-col items-center text-center p-6">
                    <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Connection Required
                    </h2>
                    <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                        Please connect to join the game
                    </p>
                    <button 
                        className="btn-fsm px-6 py-3 text-base" 
                        onClick={connect}
                    > 
                        <span>▶</span>
                        Connect
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LoadingScreen;