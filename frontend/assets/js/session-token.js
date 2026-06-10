const ACCESS_TOKEN_KEY = 'access_token';

function getStorage() {
  return localStorage;
}

export function storeAccessToken(token) {
  if (token) {
    getStorage().setItem(ACCESS_TOKEN_KEY, token);
  }
}

export function clearAccessToken() {
  getStorage().removeItem(ACCESS_TOKEN_KEY);
}

export function getAccessToken() {
  return getStorage().getItem(ACCESS_TOKEN_KEY);
}
