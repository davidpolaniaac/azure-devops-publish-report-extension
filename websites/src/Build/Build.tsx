import "./Build.scss";

import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";

import { Attachment, BuildRestClient } from "azure-devops-extension-api/Build";
import { CommonServiceIds, IProjectPageService, getClient } from "azure-devops-extension-api";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";
import { Surface, SurfaceBackground } from "azure-devops-ui/Surface";
import { Tab, TabBar, TabSize } from "azure-devops-ui/Tabs";

import { Card } from "azure-devops-ui/Card";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { Page } from "azure-devops-ui/Page";
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

    public componentDidMount() {

        SDK.init();
        this.initializeState();
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
                console.log(build);
                const enviroment: IEnvironment = {
                    project: project.id,
                    buildId: build.id,
                    name: build.definition.name
                }

                this.setState({ environment: enviroment });

                const items: ItemReport[] = [];
                const attachments: Attachment[] = await buildRestClient.getAttachments(enviroment.project, enviroment.buildId, 'publish-report');

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
                        friendlyName: (name as string).endsWith(".html") ? (name as string).slice(0, -5): name,
                        code: window.btoa(`${recordId}${name}`)

                    }
                    items.push(item);
                });

                if (items.length > 0) {
                    const item = await this.downloadItem(items[0], enviroment);
                    this.setState({ selectedTabRecordId: String(items[0].code) });
                    this.setState({ items: items });
                    this.setState({ item: item });
                } else {
                    console.log(" ¡ The report was not found !");
                    this.setState({ message: " ¡ The report was not found !" });
                }
            }

        } catch (error) {
            console.error("Error : ", error.message);
            this.setState({ message: error.message });
        }

        this.setState({ loading: false });

    }

    public render(): JSX.Element {

        const { loading, selectedTabRecordId, headerDescription, useCompactPivots, useLargeTitle, items, environment, message, item } = this.state;


        return (
            <Surface background={SurfaceBackground.neutral}>
                <Page className="report-page flex-grow">

                    <Header title={environment?.name}
                        commandBarItems={this.getCommandBarItems()}
                        description={headerDescription}
                        titleSize={useLargeTitle ? TitleSize.Large : TitleSize.Medium} />

                    <TabBar
                        onSelectedTabChanged={this.onSelectedTabChanged}
                        selectedTabId={selectedTabRecordId}
                        tabSize={useCompactPivots ? TabSize.Compact : TabSize.Tall}>

                        {items ? items.map((item) => <Tab name={item.friendlyName} id={item.code as string} key={item.code} />) : <></>}

                    </TabBar>

                    <div className="page-content page-content-top flex-grow container">


                        <Card
                            className="flex-grow bolt-card-no-vertical-padding test"
                            contentProps={{ contentPadding: false }}
                        >
                            {
                                loading ?
                                    <Spinner className="flex-grow" size={SpinnerSize.large} label={message} />
                                    : item && item.content ?
                                        <iframe
                                            className="flex-grow"
                                            frameBorder="0"
                                            srcDoc={item?.content}
                                        /> :

                                        <MessageCard
                                            className="flex-grow"
                                            severity={MessageCardSeverity.Warning}
                                        >
                                            {message}
                                        </MessageCard>
                            }

                        </Card>

                    </div>
                </Page>
            </Surface>
        );

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