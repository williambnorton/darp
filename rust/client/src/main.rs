
use structopt::StructOpt;

use std::error::Error;
use std::net::SocketAddr;
use tokio::net::UdpSocket;

use netcode::packets::MovementUpdate;

use config::Opt;

use std::time::{SystemTime,UNIX_EPOCH};

use log::{info, warn};

mod config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    env_logger::init();

    let opt :Opt = Opt::from_args();

    let remote_addr: SocketAddr = opt.connect_addr.parse()?;
    let local_addr: SocketAddr = opt.bind_addr.parse()?;


    let mut socket = UdpSocket::bind(local_addr).await?;
    socket.connect(&remote_addr).await?;


    let mut last_sent_time = SystemTime::now();

    // want to have 100K msg/sec
    // -> 10us per msg


    /*
        We want to send the same update all the time 
        so we can construct it outside the loop
    */
    let update = MovementUpdate{
        id: 7
    };
    
    for _k in 0 .. 10_000_000 {

        while last_sent_time.elapsed().unwrap().as_micros() < 10 {
            // spinloop
        }
        last_sent_time = SystemTime::now();

        let start = SystemTime::now();
        let time_now = start
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards");
        println!("time_now={:?}", time_now);


        let unixtime = time_now.as_secs() * 1000 +
            time_now.subsec_nanos() as u64 / 1_000_000;


        let encoded = bincode::serialize(&unixtime)?;
        //let encoded = bincode::serialize(&time_now)?;
        //let encoded = bincode::serialize(&f)?;
        //let encoded = bincode::serialize(&update).unwrap();
        println!("[R] unixtime:u64={} encoded={:?}",unixtime,&encoded);
/*
    {
    //
    //  let's see if the timestamp encoding works before sending
    //
    let mut secs = [0u8; 8];
    secs.clone_from_slice(&encoded[0..8]);
    let mut millisecs = [0u8; 4];
    millisecs.clone_from_slice(&encoded[8..12]);

    let timestamp = i64::from_be_bytes(secs);
    let mtimestamp = i32::from_be_bytes(millisecs);
    println!("[R]  ts={} mts={} encoded={:?}",timestamp,mtimestamp,&encoded);
    }
*/
        let u64back : u64 = bincode::deserialize(&encoded).unwrap();

        println!("sending unixtime {} encoded as = {:?} decoded back as {}",unixtime,encoded,u64back);

        socket.send(&encoded).await?;
    }


    Ok(())
}
