import "./Release.scss";

import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";

import { CommonServiceIds, IProjectPageService, getClient } from "azure-devops-extension-api";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { ReleaseRestClient, ReleaseTaskAttachment } from "azure-devops-extension-api/Release";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";
import { Tab, TabBar, TabSize } from "azure-devops-ui/Tabs";

import { Card } from "azure-devops-ui/Card";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { showRootComponent } from "../Common";

interface ItemReport {
    planId?: string;
    name?: string;
    url?: string;
    recordId?: string;
    content?: string;
    timelineId?: string;
    friendlyName?: string;
    code?: string;
}

interface IEnvironment {
    project: string;
    releaseId: number;
    environmentId: number;
    attemptNumber: number;
    name: string;
}

interface IReportContentState {
    selectedTabRecordId: string;
    headerDescription?: string;
    useLargeTitle?: boolean;
    useCompactPivots?: boolean;
    items?: ItemReport[];
    environment?: IEnvironment;
    message?: string;
    item?: ItemReport
    loading: Boolean
}

class ReportContent extends React.Component<{}, IReportContentState> {

    constructor(props: {}) {
        super(props);

        this.state = {
            selectedTabRecordId: "0",
            items: [],
            message: "Loading .....",
            item: {},
            loading: true,
        };
    }

    public componentDidMount() {

        SDK.register("registeredEnvironmentObject", () => {
            return {
                isInvisible: (tabContext: any) => {
                    if (tabContext && tabContext.releaseEnvironment && tabContext.releaseEnvironment.deployPhasesSnapshot) {
                        let phases = tabContext.releaseEnvironment.deployPhasesSnapshot;
                        let taskIds = [];
                        for (let phase of phases)
                            for (let task of phase.workflowTasks)
                                taskIds.push(task.taskId);
                        return taskIds.indexOf('13008e5e-9195-4043-9baf-c5d70da839e3') < 0;
                    }

                    return true;
                }
            }
        });

        SDK.init();
        this.initializeState();
    }

    private async initializeState(): Promise<void> {
        try {
            await SDK.ready();
            const configuration = await SDK.getConfiguration();
            const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
            const project = await projectService.getProject();

            if (configuration && configuration.releaseEnvironment && project) {

                const releaseEnvironment = configuration.releaseEnvironment;
                const deploySteps: any[] = releaseEnvironment.deploySteps;
                const deployStep = deploySteps[0];
                const releaseDeployPhases: any[] = deployStep.releaseDeployPhases;
                const runPlanIds = releaseDeployPhases.map(releaseDeployPhase => releaseDeployPhase.runPlanId);

                const enviroment: IEnvironment = {
                    project: project.id,
                    name: releaseEnvironment.name,
                    releaseId: releaseEnvironment.releaseId,
                    attemptNumber: releaseEnvironment.deploySteps.length,
                    environmentId: releaseEnvironment.id
                }

                this.setState({ environment: enviroment });

                const releaseClient = getClient(ReleaseRestClient);

                const items: ItemReport[] = [];
                for (const planId of runPlanIds) {
                    const releaseTaskAttachments: ReleaseTaskAttachment[] = await releaseClient.getReleaseTaskAttachments(enviroment.project, enviroment.releaseId, enviroment.environmentId, enviroment.attemptNumber, planId, 'publish-report');
                    releaseTaskAttachments.forEach(attachment => {
                        const item: ItemReport = {
                            url: attachment._links.self.href,
                            recordId: attachment.recordId,
                            planId: planId,
                            name: attachment.name,
                            timelineId: attachment.timelineId,
                            friendlyName: attachment.name.endsWith(".html") ? attachment.name.slice(0, -5): attachment.name,
                            code: window.btoa(`${attachment.recordId}${attachment.name}`)
                        }
                        items.push(item);
                    });
                }

                if (items.length > 0) {
                    const item = await this.downloadItem(items[0], enviroment);
                    this.setState({ selectedTabRecordId: String(items[0].code) });
                    this.setState({ items: items });
                    this.setState({ item: item });
                    SDK.notifyLoadSucceeded();
                } else {
                    this.setState({ message: " ¡ The report was not found !" });
                }
            }

        } catch (error) {
            this.setState({ message: error.message });
            SDK.notifyLoadFailed("No HTML report found..");
        }

        this.setState({ loading: false });

    }

    public render(): JSX.Element {

        const { loading, selectedTabRecordId, headerDescription, useCompactPivots, useLargeTitle, items, environment, message, item } = this.state;


        return (
                <section className="page-content">

                    <Header 
                        className="header"
                        title={environment?.name}
                        commandBarItems={this.getCommandBarItems()}
                        description={headerDescription}
                        titleSize={useLargeTitle ? TitleSize.Large : TitleSize.Medium} />

                    <TabBar
                        disableSticky={true}
                        tabsClassName="tabBar"
                        onSelectedTabChanged={this.onSelectedTabChanged}
                        selectedTabId={selectedTabRecordId}
                        tabSize={useCompactPivots ? TabSize.Compact : TabSize.Tall}>

                        {items ? items.map((item) => <Tab name={item.friendlyName} id={item.code as string} key={item.code} />) : <></>}

                    </TabBar>

                        <Card
                            className="container-frame flex-grow"
                            contentProps={{ contentPadding: false }}
                        >
                            {
                                loading ?
                                    <Spinner className="flex-grow" size={SpinnerSize.large} label={message} />
                                    : item && item.content ?
                                        <iframe
                                            id="iframe-report"
                                            className="frame"
                                            frameBorder="0"
                                            srcDoc={item?.content}
                                            onLoad={this.adjustIframeHeight}
                                        /> :

                                        <MessageCard
                                            className="flex-grow"
                                            severity={MessageCardSeverity.Warning}
                                        >
                                            {message}
                                        </MessageCard>
                            }

                        </Card>
            </section>
        );

    }

    private adjustIframeHeight = () => {
        const iframe: any = document.getElementById("iframe-report");
        iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
    };


    private updateItem = async (code: string) => {
        const { items, environment } = this.state;
        const item = (items as ItemReport[]).find(x => x.code == code);
        const itemIndex = (items as ItemReport[]).findIndex((x => x.code == code));

        if (environment && items && !items[itemIndex].content) {

            const item = await this.downloadItem(items[itemIndex], environment);;
            return item;
            
        } else {
            return item;
        }
    }

    private downloadItem = async (item: ItemReport, environment: IEnvironment) => {
        const releaseClient = getClient(ReleaseRestClient);
        const content: ArrayBuffer = await releaseClient.getReleaseTaskAttachmentContent(environment.project, environment.releaseId, environment.environmentId, environment.attemptNumber, item.planId as string, item.timelineId as string, item.recordId as string, 'publish-report', item.name as string);
        const dataView = new DataView(content);
        const decoder = new TextDecoder("utf-8");
        const decodedString = decoder.decode(dataView);
        item.content = decodedString;
        return item;
    }

    private onSelectedTabChanged = async (newTabId: string) => {
        this.setState({ loading: true });
        const item = await this.updateItem(newTabId);
        this.setState({
            selectedTabRecordId: newTabId,
            item
        });

        this.setState({ loading: false });
    }

    private getCommandBarItems(): IHeaderCommandBarItem[] {
        const { item } = this.state;
        return [
            {
                id: "download",
                text: "Download",
                onActivate: () => { item && item.url ? window.open(item?.url, "_blank"): undefined },
                iconProps: {
                    iconName: 'Download'
                },
                isPrimary: true,
                tooltipProps: {
                    text: "Download a report"
                }
            }
        ];
    }

}

showRootComponent(<ReportContent />);
