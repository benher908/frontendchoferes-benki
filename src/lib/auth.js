const TOKEN_KEY = 'choferes_token';
const USER_KEY = 'choferes_user';

export function saveSession(token, usuario){
    if(typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
};

export function getToken(){
    if(typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
};

export function getUser(){
    if(typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if(!raw) return null;
    try{
        return  JSON.parse(raw);
    } catch{
        return null;
    }
};

export function clearSession(){
    if(typeof window === 'undefined') return null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

export function  redirectByRole(rol){
    if(rol === 'supervisor') return '/supervisor';
    if(rol === 'chofer') return '/chofer';
    if(rol === 'checador_unidad') return '/checador';
    return '/login';
};
