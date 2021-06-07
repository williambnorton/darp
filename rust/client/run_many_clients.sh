#!/bin/bash

for ((i = 0 ; i < 8 ; i++)); do
  ./target/release/client &
done

