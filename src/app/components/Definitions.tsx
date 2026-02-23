import { useEffect, useRef, useState } from "react";
import { socketEvents } from "../../shared/socketEvents";
import { DictionaryEntry } from "../../shared/types";
import { onSocketEvent } from "../../shared/socketClient";
import { getSocketManager } from "../lib/socket";

function Definitions() {
    const socket = getSocketManager();
    const definitions = useRef(new Map<string, DictionaryEntry>());
    const [defCount, setDefCount] = useState(0);

    useEffect(() => {
        onSocketEvent(socket, socketEvents.wordDefinition, (d: DictionaryEntry) => {
            // if (definitions.current.has(d.key)) return;
            definitions.current.set(d.key, d);
            setDefCount(count => count + 1);
            console.log(definitions);
        });
    }, []);
    return (
        <div className="panel flex flex-col w-full p-0! h-full overflow-x-hidden overflow-y-scroll">
            <div className="flex-1 w-full overflow-y-scroll">
                <table className="table p-0!#">
                    <thead>
                        <tr>
                            <th className="p-3!"><p className="text-xs">Word</p></th>
                            <th className="p-3!"><p className="text-xs">Definition</p></th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            Array.from(definitions.current).reverse().map(([k, v], i) => {
                                return (
                                    <tr key={i} className={i === 0 ? "bg-gray-800" : ""}>
                                        <td><p className="text-xs">{k}</p></td>
                                        <td><p className="text-xs">{v.data[0].definition}</p></td>
                                    </tr>
                                );
                            })
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Definitions;