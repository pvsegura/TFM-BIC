import { forwardRef } from "react";
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  type LinkProps,
  type NavLinkProps,
} from "react-router";

/**
 * The app's links (M22): React Router links with `viewTransition` on, so moving between pages fades
 * the old page out and the new one in (View Transitions API; styles in styles/index.css). Browsers
 * without the API navigate as before and get a plain fade-in; reduced-motion users get no animation.
 * A link can still opt out with `viewTransition={false}`.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(props, ref) {
  return <RouterLink ref={ref} viewTransition {...props} />;
});

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(props, ref) {
  return <RouterNavLink ref={ref} viewTransition {...props} />;
});
