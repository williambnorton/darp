#![warn(rust_2018_idioms)]

use structopt::StructOpt;

use tokio;
use tokio::net::UdpSocket;

use config::Opt;
use netcode::packets::*;
use tokio::runtime::Runtime;

use tokio::sync::mpsc;
use tokio::sync::mpsc::*;
use futures::future::join_all;

use log::{info, warn};

use std::time::{SystemTime,UNIX_EPOCH};

mod config;

pub fn main(){
    simple_logger::init().unwrap();

    let opt : Opt = Opt::from_args();

    println!("{:#?}", opt);

    let mut rt = Runtime::new().unwrap();

    let (tx,rx) = mpsc::channel(100);

    let handler = rt.spawn(rcv_pass_handler(opt.clone(),rx));
    let receiver = rt.spawn(rcv_pass(opt.clone(),tx));
    let join_handler = join_all(vec![handler,receiver]);

    rt.block_on(join_handler);

}

async fn rcv_pass(opt: Opt,mut tx: Sender<MovementUpdate>,) {

    let mut socket = UdpSocket::bind(&opt.bind_addr).await.unwrap();
    println!("Listening on: {}", socket.local_addr().unwrap());

    let ms_in_sec=1_000.0;

    let mut buf= vec![0; 512];

    let mut msg_ctr = 0;
    let mut total_msg_ctr = 0;

    let mut start_time = SystemTime::now();

    loop{
        let _res = socket.recv_from(&mut buf).await.unwrap();

        // reset start time when we start to receive messages
        if msg_ctr == 0 {
            start_time = SystemTime::now();
        }

        let packet: MovementUpdate = bincode::deserialize(&buf[..]).unwrap();

        tx.send(packet).await.unwrap();

        msg_ctr+=1;
        total_msg_ctr+=1;
//        if msg_ctr%1_000_000 == 1_000_000-1 {
        if msg_ctr%1_00 == 1_00-1 {
                let timediff = start_time.elapsed().unwrap();
            let packet_rate = (1_000_000.0/timediff.as_millis()as f32)*ms_in_sec;

            //
            //  my timestamp
            //
            let start = SystemTime::now();
            let time_now = start
                .duration_since(UNIX_EPOCH)
                .expect("Time went backwards");
            println!("elapsed time since {:?}", time_now);

            let myunixtime = time_now.as_secs() * 1000 +
                time_now.subsec_nanos() as u64 / 1_000_000;
    
            println!("my unixtime in millis {}", myunixtime);

            //
            //  incoming packet timestamp
            //
            //info!("incoming buf={:?} ",&buf);
            let unixtime : u64 = bincode::deserialize(&buf).unwrap();
            //let milliseconds : u32 = bincode::deserialize(&buf[8..12]).unwrap();

            println!("myunixtime={} deserialized unixtime = {} delta = {}", 
                myunixtime, unixtime,  myunixtime-unixtime);
            //x=x-unixtime;
            let mut secs = [0u8; 8];
            secs.clone_from_slice(&buf[0..8]);
            let mut millisecs = [0u8; 4];
            millisecs.clone_from_slice(&buf[8..12]); //
            let timestamp = i64::from_be_bytes(secs);
            let mtimestamp = u32::from_be_bytes(millisecs);
            //
            //  calculate difference in timestamps
            //
            //info!("[R]  ts={} mts={} packet={:?}",timestamp,mtimestamp,&buf);
            //let delta_seconds:i64=myunixtime-timestamp;
            //info!("deltaSec={} ",delta_seconds);
            //let delta_milliseconds:i32 = myunixtime as i32 - mtimestamp as i32;
            //info!("deltamilli={}",delta_milliseconds);

            //let naive = NaiveDateTime::from_timestamp(timestamp, 0);

            //let delta = ts - start_time;

            info!("[R] {}.{} Current packet rate {}Pps at count {} buf={:?} ",timestamp,mtimestamp,packet_rate,total_msg_ctr,&buf);
            //start_time = SystemTime::now();


        }
    }

}

async fn rcv_pass_handler(_opt: Opt,mut rx: Receiver<MovementUpdate>) {
    let mut msg_ctr = 0;
    let mut total_msg_ctr = 0;
    let mut start_time = SystemTime::now();

    while let Some(_packet) = rx.recv().await {
        msg_ctr+=1;
        total_msg_ctr+=1;

        if msg_ctr%1_000_000 == 1_000_000-1 {
            let timediff = start_time.elapsed().unwrap();
            let packet_rate = (1_000_000.0/timediff.as_millis()as f32)*1_000.0;
            info!("[H] Current packet rate {}Pps at count {}",packet_rate,total_msg_ctr);
            start_time = SystemTime::now();
        }
    }

}