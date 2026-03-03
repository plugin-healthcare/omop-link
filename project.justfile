## Add your own just recipes here. This is imported by the main justfile.

# Overriding recipes from the root justfile by adding a recipe with the same
# name in this file is not possible until a known issue in just is fixed,
# https://github.com/casey/just/issues/2540

# Generate md documentation for the omop_cdm schema into docs/omop-cdm/
[group('model development')]
gen-doc-omop-cdm:
  -mkdir -p docs/schema
  uv run gen-yaml src/omop_cdm/schema/omop_cdm.yaml > docs/schema/omop_cdm.yaml
  -mkdir -p docs/omop-cdm
  uv run gen-doc -d docs/omop-cdm src/omop_cdm/schema/omop_cdm.yaml
