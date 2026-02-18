import * as vscode from 'vscode';

export class AuthManager {
    /**
     * Authenticates with GitHub using VS Code's built-in authentication provider.
     * @returns The access token if successful, undefined otherwise.
     */
    public static async getGitHubToken(): Promise<string | undefined> {
        try {
            const session = await vscode.authentication.getSession('github', ['repo', 'workflow'], { createIfNone: true });
            if (session) {
                return session.accessToken;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`GitHub Authentication Failed: ${error}`);
        }
        return undefined;
    }

    /**
     * Gets the current user's session if available without forcing login.
     */
    public static async getSession() {
        return await vscode.authentication.getSession('github', ['repo', 'workflow'], { createIfNone: false });
    }
}
