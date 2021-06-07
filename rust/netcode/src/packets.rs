
use serde::{Serialize, Deserialize};


#[derive(Serialize, Deserialize, PartialEq, Debug)]
pub struct MovementUpdate {
    pub id: u32
}
