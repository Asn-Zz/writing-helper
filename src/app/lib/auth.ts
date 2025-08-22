export const storeAuthKey = 'writing_helper_auth_token'

export const getIsAuthed = () => {
    const authKey = localStorage.getItem(storeAuthKey);

    return authKey === process.env.NEXT_PUBLIC_AUTH_TOKEN;
}