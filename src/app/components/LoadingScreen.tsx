import { Dispatch } from "react";

interface props {
    setUserIsConnected: Dispatch<boolean>,
}

function LoadingScreen(props: props){
    function connect() {
        props.setUserIsConnected(true);
    }
    return (
        <div className="flex flex-col gap-3">
            <p>user is not connected</p>
            <button className="border-2 border-white p-3 m-2" onClick={connect}> connect </button>
        </div>
    )
}

export default LoadingScreen;