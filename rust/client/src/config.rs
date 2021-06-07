use structopt::StructOpt;


#[derive(StructOpt, Debug)]
#[structopt(name = "basic")]
pub struct Opt {
    #[structopt(short, long, default_value = "127.0.0.1:31234")]
    pub connect_addr: String,

    #[structopt(short, long, default_value = "0.0.0.0:0")]
    pub bind_addr: String,
}

