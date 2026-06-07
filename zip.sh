cd ..

zip -r frontend.zip ./frontend \
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