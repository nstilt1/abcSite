cd ..

rm ./frontend.zip

zip -r frontend.zip ./frontend \
  -i "*/*.ts" \
  -i "*/*.tsx" \
  -i "*/*.json" \
  -i "*/*.rs" \
  -i "*/*.wgsl" \
  -i "*/*.js" \
  -i "*/*.jsx" \
  -i "*/*.toml" \
  -i "*/*.sh" \
  -i "*/*.md" \
  -i "*/*.yml" \
  -x "*/wasm/*" \
  -x "*/node_modules/*" \
  -x "*/amplify_backup/*" \
  -x "*/amplify/*" \
  -x "*/.next/*" \
  -x "*/cdk.out/*" \
  -x "*/builds/*" \
  -x "*/*.zip" \
  -x "*/target/*" \
  -x "*/.git"