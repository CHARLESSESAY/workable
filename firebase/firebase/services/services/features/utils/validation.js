export function validateEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}
export function validateName(n){return n&&n.trim().length>=2;}
export function validatePassword(p){return p&&p.length>=6;}
export function validateGoal(g){return g&&g.trim().length>=10;}
