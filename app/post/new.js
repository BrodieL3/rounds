import { useEffect } from 'react';
import { router } from 'expo-router';

// Posting is deferred for the beta (the social layer is Out of Scope in ISA.md).
// The Plus "Create a post" action must never dead-end (ISC-21), so route it to the
// hero beta action — logging a visit — instead of a placeholder screen.
export default function CreatePostScreen() {
  useEffect(() => {
    router.replace('/add');
  }, []);

  return null;
}
