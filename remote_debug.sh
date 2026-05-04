#!/bin/bash



ssh -f -N -L 8080:localhost:8080 deck@192.168.101.234



google-chrome http://localhost:8080
