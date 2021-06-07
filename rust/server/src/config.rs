use structopt::StructOpt;

#[derive(StructOpt, Debug, Clone)]
#[structopt(name = "basic")]
pub struct Opt {
    #[structopt(short, long, default_value = "127.0.0.1:31234")]
    pub bind_addr: String
}

