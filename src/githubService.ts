import { Octokit } from '@octokit/rest';
import * as vscode from 'vscode';

export interface WorkflowRun {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    html_url: string;
}

export class GitHubService {
    private octokit: Octokit;

    constructor(token: string) {
        this.octokit = new Octokit({ auth: token });
    }

    public async getUser() {
        const { data } = await this.octokit.users.getAuthenticated();
        return data;
    }

    /**
     * Creates a new repository if it doesn't exist.
     */
    public async createRepoIfNotExists(repoName: string, isPrivate: boolean = true): Promise<string> {
        try {
            // Check if repo exists
            const user = await this.getUser();
            try {
                const { data } = await this.octokit.repos.get({ owner: user.login, repo: repoName });
                return data.html_url;
            } catch (e: any) {
                if (e.status === 404) {
                    // Create repo
                    const { data } = await this.octokit.repos.createForAuthenticatedUser({
                        name: repoName,
                        private: isPrivate,
                        auto_init: true
                    });
                    return data.html_url;
                }
                throw e;
            }
        } catch (error: any) {
            throw new Error(`Failed to check/create repo: ${error.message}`);
        }
    }

    /**
     *  Enables GitHub Pages for the repository.
     */
    public async enablePages(owner: string, repo: string, sourceBranch: string = 'main', sourcePath: string = '/') {
         try {
            // Check if pages are already enabled
            try {
                await this.octokit.repos.getPages({ owner, repo });
                return; // Already enabled
            } catch (e: any) {
                if (e.status !== 404) throw e;
            }

            await this.octokit.repos.createPagesSite({
                owner,
                repo,
                source: {
                    branch: sourceBranch,
                    path: sourcePath as "/" | "/docs"
                }
            });
         } catch (error: any) {
             console.error("Pages enablement error (might check settings manually):", error.message);
             // Don't block if it fails, sometimes it's permission related or already transitioning
         }
    }

    /**
     * Gets the latest workflow runs.
     */
    public async getRecentWorkflowRuns(owner: string, repo: string): Promise<WorkflowRun[]> {
        try {
            const { data } = await this.octokit.actions.listWorkflowRunsForRepo({
                owner,
                repo,
                per_page: 5
            });
            
            return data.workflow_runs.map(run => ({
                id: run.id,
                name: run.name || 'Unknown',
                status: run.status || 'unknown',
                conclusion: run.conclusion,
                html_url: run.html_url
            }));
        } catch (error) {
            console.error("Error fetching workflows:", error);
            return [];
        }
    }
}
