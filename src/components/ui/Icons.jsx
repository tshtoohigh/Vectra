import React from 'react';

/**
 * Inline SVG icon set (stroke-based, 24x24 grid).
 * No emoji anywhere in the product UI — these are the only glyphs.
 *
 * Usage: <Icon.Calendar className="h-4 w-4" />
 */

function create(displayName, paths, opts = {}) {
  const Component = ({ className = 'h-5 w-5', strokeWidth = 1.75, ...rest }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={opts.fill ? 'currentColor' : 'none'}
      stroke={opts.fill ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths}
    </svg>
  );
  Component.displayName = displayName;
  return Component;
}

const p = (d, key) => <path key={key ?? d.slice(0, 8)} d={d} />;

export const Icon = {
  // ---------- Brand / product ----------
  Logo: create('Logo', [
    <rect key="r" x="3" y="3" width="18" height="18" rx="5" />,
    p('M8 12.5l2.5 2.5L16 9.5', 'check'),
  ]),
  GraduationCap: create('GraduationCap', [
    p('M22 10L12 5 2 10l10 5 10-5Z'),
    p('M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5'),
  ]),

  // ---------- Navigation ----------
  Dashboard: create('Dashboard', [
    <rect key="a" x="3" y="3" width="7.5" height="8.5" rx="1.5" />,
    <rect key="b" x="13.5" y="3" width="7.5" height="5.5" rx="1.5" />,
    <rect key="c" x="13.5" y="11.5" width="7.5" height="9.5" rx="1.5" />,
    <rect key="d" x="3" y="14.5" width="7.5" height="6.5" rx="1.5" />,
  ]),
  Calendar: create('Calendar', [
    <rect key="r" x="3" y="5" width="18" height="16" rx="2.5" />,
    p('M3 10h18', 'line'),
    p('M8 3v4', 'l'),
    p('M16 3v4', 'r'),
  ]),
  CheckSquare: create('CheckSquare', [
    p('M9 11.5l2.5 2.5L16 9'),
    p('M21 12v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h9'),
  ]),
  BookOpen: create('BookOpen', [
    p('M12 6.5C12 5 10 4 7.5 4H3v14h4.5c2.5 0 4.5 1 4.5 2.5'),
    p('M12 6.5C12 5 14 4 16.5 4H21v14h-4.5c-2.5 0-4.5 1-4.5 2.5'),
    p('M12 6.5v14', 'spine'),
  ]),
  Settings: create('Settings', [
    <circle key="c" cx="12" cy="12" r="3" />,
    p(
      'M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.7a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.3 9v.03a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
    ),
  ]),
  Timer: create('Timer', [
    <circle key="c" cx="12" cy="13" r="8" />,
    p('M12 9.5V13l2.5 1.5', 'hands'),
    p('M9 2h6', 'top'),
  ]),
  Layers: create('Layers', [p('M12 3l9 5-9 5-9-5 9-5Z'), p('M3 13l9 5 9-5', 'mid')]),

  // ---------- Actions ----------
  Plus: create('Plus', [p('M12 5v14'), p('M5 12h14', 'h')]),
  Check: create('Check', [p('M5 12.5l4.5 4.5L19 7')]),
  X: create('X', [p('M6 6l12 12'), p('M18 6L6 18', 'b')]),
  Pencil: create('Pencil', [p('M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z')]),
  Trash: create('Trash', [
    p('M3 6h18'),
    p('M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6', 'lid'),
    p('M5.5 6l.8 13a2 2 0 0 0 2 1.9h7.4a2 2 0 0 0 2-1.9l.8-13', 'can'),
  ]),
  Search: create('Search', [
    <circle key="c" cx="11" cy="11" r="7" />,
    p('M20 20l-3.9-3.9', 'handle'),
  ]),
  Filter: create('Filter', [p('M3 5h18l-7 8.5V20l-4-2.5v-4L3 5Z')]),
  Upload: create('Upload', [
    p('M12 16V4'),
    p('M8 8l4-4 4 4', 'arrow'),
    p('M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11A2.5 2.5 0 0 0 20 18.5V16', 'tray'),
  ]),
  Download: create('Download', [
    p('M12 4v12'),
    p('M8 12l4 4 4-4', 'arrow'),
    p('M4 18.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5', 'tray'),
  ]),
  MoreHorizontal: create('MoreHorizontal', [
    <circle key="a" cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />,
    <circle key="b" cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />,
    <circle key="c" cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />,
  ]),

  // ---------- Chevrons / arrows ----------
  ChevronDown: create('ChevronDown', [p('M6 9.5l6 6 6-6')]),
  ChevronRight: create('ChevronRight', [p('M9.5 6l6 6-6 6')]),
  ChevronLeft: create('ChevronLeft', [p('M14.5 6l-6 6 6 6')]),
  ArrowRight: create('ArrowRight', [p('M4 12h16'), p('M14 6l6 6-6 6', 'head')]),
  ArrowUpRight: create('ArrowUpRight', [p('M7 17L17 7'), p('M8 7h9v9', 'head')]),

  // ---------- Status / feedback ----------
  Bell: create('Bell', [
    p('M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z'),
    p('M10.3 19a2 2 0 0 0 3.4 0', 'clapper'),
  ]),
  AlertTriangle: create('AlertTriangle', [
    p('M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z'),
    p('M12 9.5v4', 'bar'),
    p('M12 17.2h.01', 'dot'),
  ]),
  Info: create('Info', [
    <circle key="c" cx="12" cy="12" r="9" />,
    p('M12 11v5', 'bar'),
    p('M12 8h.01', 'dot'),
  ]),
  CircleCheck: create('CircleCheck', [
    <circle key="c" cx="12" cy="12" r="9" />,
    p('M8.5 12.5l2.5 2.5 4.5-5', 'tick'),
  ]),
  Clock: create('Clock', [<circle key="c" cx="12" cy="12" r="9" />, p('M12 7.5V12l3 2', 'hands')]),
  Flame: create('Flame', [
    p(
      'M12 21c3.9 0 6.5-2.5 6.5-6 0-4.5-4.5-6.5-4-11-3 1.5-5 4.5-5 7 0-1-1-2.5-2-3-1 1.5-2 3.5-2 6.5 0 3.5 2.6 6.5 6.5 6.5Z',
    ),
  ]),
  Target: create('Target', [
    <circle key="a" cx="12" cy="12" r="9" />,
    <circle key="b" cx="12" cy="12" r="5" />,
    <circle key="c" cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />,
  ]),
  TrendingUp: create('TrendingUp', [p('M3 17l6-6 4 4 8-8'), p('M15 7h6v6', 'head')]),
  BarChart: create('BarChart', [
    p('M4 20V10'),
    p('M10 20V4', 'b'),
    p('M16 20v-7', 'c'),
    p('M22 20H2', 'base'),
  ]),

  // ---------- AI / cloud ----------
  Sparkles: create('Sparkles', [
    p('M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z'),
    p('M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z', 'sm'),
  ]),
  Bot: create('Bot', [
    <rect key="r" x="4" y="8" width="16" height="12" rx="3" />,
    p('M12 4.5V8', 'antenna'),
    <circle key="d" cx="12" cy="3.2" r="1.2" />,
    p('M9.5 13h.01', 'eyeL'),
    p('M14.5 13h.01', 'eyeR'),
    p('M9.5 16.5h5', 'mouth'),
  ]),
  Cloud: create('Cloud', [
    p('M6.5 19a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 17.7 9.2 3.9 3.9 0 0 1 17 19H6.5Z'),
  ]),
  Database: create('Database', [
    <ellipse key="e" cx="12" cy="6" rx="8" ry="3" />,
    p('M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'mid'),
    p('M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6', 'bot'),
  ]),
  Zap: create('Zap', [p('M13.5 2L4 14h6l-1.5 8L19 10h-6l.5-8Z')]),
  Shield: create('Shield', [
    p('M12 21s7.5-3.4 7.5-9.5V5.5L12 3 4.5 5.5V11.5C4.5 17.6 12 21 12 21Z'),
    p('M9 12l2.2 2.2L15.5 10', 'tick'),
  ]),
  FileText: create('FileText', [
    p('M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8l-5-5Z'),
    p('M14 3v5h5', 'fold'),
    p('M9 13h6', 'l1'),
    p('M9 17h4', 'l2'),
  ]),

  // ---------- People / account ----------
  User: create('User', [
    <circle key="c" cx="12" cy="8" r="4" />,
    p('M4.5 21a7.5 7.5 0 0 1 15 0', 'body'),
  ]),
  Users: create('Users', [
    <circle key="c" cx="9" cy="8" r="3.6" />,
    p('M2.5 21a6.5 6.5 0 0 1 13 0', 'body'),
    p('M16.5 4.8a3.6 3.6 0 0 1 0 6.9', 'head2'),
    p('M18 14.5a6.5 6.5 0 0 1 3.5 5.8', 'body2'),
  ]),
  LogOut: create('LogOut', [
    p('M15 4h3.5A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5H15'),
    p('M10 8l-4 4 4 4', 'arrow'),
    p('M6 12h9', 'line'),
  ]),
  Mail: create('Mail', [
    <rect key="r" x="3" y="5" width="18" height="14" rx="2.5" />,
    p('M3.5 7l8.5 6 8.5-6', 'flap'),
  ]),
  Lock: create('Lock', [
    <rect key="r" x="4.5" y="10.5" width="15" height="10.5" rx="2.5" />,
    p('M8 10.5V7.5a4 4 0 0 1 8 0v3', 'shackle'),
  ]),
  Eye: create('Eye', [
    p('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z'),
    <circle key="c" cx="12" cy="12" r="3" />,
  ]),
  EyeOff: create('EyeOff', [
    p('M10.6 6.1A8.9 8.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.4 3.1'),
    p('M6.3 8A16.6 16.6 0 0 0 2.5 12S6 18 12 18a8.7 8.7 0 0 0 3.6-.8', 'b'),
    p('M9.9 9.9a3 3 0 0 0 4.2 4.2', 'iris'),
    p('M3 3l18 18', 'slash'),
  ]),

  // ---------- Views ----------
  List: create('List', [
    p('M8 6h13'),
    p('M8 12h13', 'b'),
    p('M8 18h13', 'c'),
    p('M3.5 6h.01', 'd1'),
    p('M3.5 12h.01', 'd2'),
    p('M3.5 18h.01', 'd3'),
  ]),
  Columns: create('Columns', [
    <rect key="r" x="3" y="4" width="18" height="16" rx="2.5" />,
    p('M9 4v16', 'l1'),
    p('M15 4v16', 'l2'),
  ]),
  Menu: create('Menu', [p('M3 6h18'), p('M3 12h18', 'b'), p('M3 18h18', 'c')]),
  PanelLeft: create('PanelLeft', [
    <rect key="r" x="3" y="4" width="18" height="16" rx="2.5" />,
    p('M9.5 4v16', 'line'),
  ]),

  // ---------- Theme ----------
  Sun: create('Sun', [
    <circle key="c" cx="12" cy="12" r="4.2" />,
    p('M12 2v2', 'a'),
    p('M12 20v2', 'b'),
    p('M4.2 4.2l1.5 1.5', 'c'),
    p('M18.3 18.3l1.5 1.5', 'd'),
    p('M2 12h2', 'e'),
    p('M20 12h2', 'f'),
    p('M4.2 19.8l1.5-1.5', 'g'),
    p('M18.3 5.7l1.5-1.5', 'h'),
  ]),
  Moon: create('Moon', [p('M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z')]),
};

export default Icon;
