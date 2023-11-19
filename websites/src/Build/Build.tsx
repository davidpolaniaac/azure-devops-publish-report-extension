import "./Build.scss";

import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";

import { Attachment, BuildRestClient } from "azure-devops-extension-api/Build";
import { CommonServiceIds, IProjectPageService, getClient } from "azure-devops-extension-api";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
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
    buildId: number;
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

    public async componentDidMount() {

        SDK.init({ loaded: false });
        await this.initializeState();
    }

    private async getBuild(configuration: any): Promise<any> {
        return new Promise((resolve, reject) => {
            configuration.onBuildChanged((build: any) => {
                resolve(build);
            });
        });
    }


    private async initializeState(): Promise<void> {
        try {
            await SDK.ready();
            const configuration = await SDK.getConfiguration();
            const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
            const project = await projectService.getProject();

            if (configuration && project) {
                const build = await this.getBuild(configuration);

                const buildRestClient = getClient(BuildRestClient);
                const environment: IEnvironment = {
                    project: project.id,
                    buildId: build.id,
                    name: build.definition.name
                }

                this.setState({ environment: environment });

                const items: ItemReport[] = [];
                const attachments: Attachment[] = await buildRestClient.getAttachments(environment.project, environment.buildId, 'publish-report');

                attachments.forEach(attachment => {

                    const url = attachment._links.self.href;
                    const pathname = decodeURI(new URL(url).pathname);
                    const values = pathname.split('/');
                    const name = values.pop();
                    const type = values.pop();
                    const category = values.pop();
                    const recordId = values.pop();
                    const timelineId = values.pop();

                    const item: ItemReport = {
                        url,
                        recordId: recordId,
                        timelineId: timelineId,
                        name: name,
                        friendlyName: (name as string).endsWith(".html") ? (name as string).slice(0, -5) : name,
                        code: window.btoa(`${recordId}${name}`)

                    }
                    items.push(item);
                });

                if (items.length > 0) {
                    const item = await this.downloadItem(items[0], environment);
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
                                    src={this.getGeneratedPageURL(item?.content)}
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

    private getGeneratedPageURL(html: string): string {
        const blob = new Blob([html], { type: "text/html" })
        return URL.createObjectURL(blob);
    }

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
        const buildRestClient = getClient(BuildRestClient);
        const content: ArrayBuffer = await buildRestClient.getAttachment(environment.project, environment.buildId, item.timelineId as string, item.recordId as string, 'publish-report', item.name as string);
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
                onActivate: () => { item && item.url ? window.open(item?.url, "_blank") : undefined },
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