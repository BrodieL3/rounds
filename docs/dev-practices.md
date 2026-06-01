# Development Practices

## Dev Server Management

The Expo dev server may already be running on `localhost:8081`. Do **not** run `npx expo start` again — it will conflict. For debugging, read Metro console output from the existing server or use `curl` against it. Build commands (`expo export`, `expo-doctor`) are fine for verification but should not replace live debugging from the running server.
