#!/bin/bash

# Specify the input folder and output file
input_folder="./cong-bounds"
output_file="output.mbtiles"

# Find all GeoJSON files in the folder
geojson_files=$(find "$input_folder" -type f -name "*.geojson")

# Construct the Tippecanoe command
tippecanoe_command="tippecanoe --force -z10 -x member -x state --no-tile-size-limit --simplification=10 --maximum-tile-bytes=1250 --detect-shared-borders -l districts -o $output_file"

# Add each GeoJSON file to the command
for file in $geojson_files; do
  tippecanoe_command="$tippecanoe_command $file"
done

# Execute the Tippecanoe command
eval "$tippecanoe_command"