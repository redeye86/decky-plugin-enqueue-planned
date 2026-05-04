#!/bin/bash



ssh -f -N -L 8080:localhost:8080 deck@steamdeck



google-chrome http://localhost:8080
