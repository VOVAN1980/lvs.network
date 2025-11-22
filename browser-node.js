use std::env;
use std::time::Duration;

use tokio::time::sleep;
use futures::{SinkExt, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::Message as WsMsg};

use lvs_core::types::{SdmPayload, Message};
use lvs_core::shared_state::SharedState;
use serde_json::json;

#[tokio::main]
async fn main() {
    let node_id = env::var("LVS_NODE_ID").unwrap_or("node1".to_string());
    let gateway_url = env::var("LVS_GATEWAY")
        .unwrap_or("ws://127.0.0.1:9001/ws".to_string());

    println!("Starting LVS Rust node: {}", node_id);
    println!("Gateway: {}", gateway_url);

    let (ws_stream, _) = connect_async(&gateway_url)
        .await
        .expect("Cannot connect to LVS gateway");

    println!("[node] connected to gateway");

    let (mut ws_tx, mut ws_rx) = ws_stream.split();

    let mut state = SharedState::new();

    // ---------- HELLO (через сырой JSON, чтобы не гадать структуру enum) ----------
    let hello_json = json!({
        "type": "hello",
        "node_id": node_id,
        "payload": {
            "kind": "rust-node",
            "version": "0.2.0"
        }
    })
    .to_string();

    ws_tx
        .send(WsMsg::Text(hello_json))
        .await
        .expect("failed to send hello");
    println!("[node] hello sent");

    // ---------- запрос списка пиров (уже через типизированный enum) ----------
    let ask = Message::PeersRequest {
        node_id: node_id.clone(),
    };
    let ask_str = serde_json::to_string(&ask).unwrap();
    ws_tx
        .send(WsMsg::Text(ask_str))
        .await
        .expect("failed to send peers_request");
    println!("[node] peers_request sent");

    loop {
        tokio::select! {

            // ---------- входящие сообщения от gateway ----------
            msg = ws_rx.next() => {
                if msg.is_none() { continue; }
                let msg = msg.unwrap();

                if let Ok(WsMsg::Text(text)) = msg {
                    if let Ok(parsed) = serde_json::from_str::<Message>(&text) {

                        match parsed {

                            // список пиров от gateway / браузера
                            Message::Peers { node_id: from, payload } => {
                                let ids: Vec<String> =
                                    payload.peers.into_iter().map(|p| p.node_id).collect();
                                println!("[node] peers from {} :: {:?}", from, ids);
                            }

                            // SDM от других нод
                            Message::Sdm { node_id: other, payload } => {
                                state.apply_sdm(other.clone(), payload.clone());
                                println!("[SDM] from {} :: diff={:?}, weight={:.3}, cycle={}",
                                    other, payload.diff, payload.weight, payload.cycle_id);
                            }

                            _ => {
                                // остальное пока игнорим
                            }
                        }
                    }
                }
            }

            // ---------- периодический SDM broadcast ----------
            _ = sleep(Duration::from_millis(70)) => {
                state.tick();

                let payload = SdmPayload {
                    diff: vec![
                        rand::random::<f64>() * 0.03,           // "локальная" энтропия
                        0.5,                                   // TC (пока фикс)
                        100.0 + rand::random::<f64>() * 2.0,   // VU вокруг 100
                    ],
                    weight: 0.5,
                    cycle_id: state.global_cycle,
                };

                let msg = Message::Sdm {
                    node_id: node_id.clone(),
                    payload,
                };

                let json = serde_json::to_string(&msg).unwrap();
                let _ = ws_tx.send(WsMsg::Text(json)).await;
            }
        }
    }
}
