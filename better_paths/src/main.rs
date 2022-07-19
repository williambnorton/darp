use serde::{Serialize, Deserialize};
use serde_json::{Result,Value};
use std::fs::File;
use std::io::Read;
use std::path;
use std::thread::sleep_ms;

#[derive(Serialize,Deserialize,Debug)]
struct PulseGroups {
    
}

fn main() {

    //while :
    //    sleep 1 
    //    if wireguard file changed, launch wg-quick
    //    if pulsegroups file changed, run better path
    //let pgs=readfile();

  
    let darp_dir = std::env::var("DARPDIR").unwrap_or("./".to_string());
    let filename = darp_dir+"/pulse_groups.json";
    let mut file = File::open(filename).unwrap();
    let mut data = String::new();
    file.read_to_string(&mut data).unwrap();

    let json:Value = serde_json::from_str(&data).unwrap();
    println!("{:?}", json);
}
