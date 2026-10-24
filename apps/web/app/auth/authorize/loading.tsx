import { AuthTransitionView } from './auth-transition-view';

export default function Loading() {
  return <AuthTransitionView phase="checking" />;
}
