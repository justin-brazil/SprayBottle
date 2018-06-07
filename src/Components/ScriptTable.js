import React from 'react'
import { Table, Column, Cell, SelectionModes } from '@blueprintjs/table';
import { Button, Text, Switch, Intent, Alignment, Icon, Popover, Tooltip, Position, Spinner } from '@blueprintjs/core';
import ScriptStatus from './ScriptStatus'
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/table/lib/css/table.css';

const electron = window.require('electron');
const powershell = electron.remote.require('powershell');
const sudo = electron.remote.require('sudo-prompt');
const fs = window.require("fs");

const Store = window.require('electron-store');
const store = new Store();

const CheckIfPs1 = (file) => {
    return file.match(/.+\.ps1\b/);
}

class ScriptTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            scripts: '',
            scriptLog: '',
            scriptStatus: '',
            scriptPath: store.get('scriptPath'),
            scriptParam: '',
            scriptAdm: '',
            colWidth: [100, 100, 100, 100, 100],
        }
        this.runPosh = this.runPosh.bind(this);
        this.updateArray = this.updateArray.bind(this);
        this.updateColumnWidth = this.updateColumnWidth.bind(this);

        if (this.state.scriptPath != undefined) {
            fs.readdir(this.state.scriptPath, (err, dir) => {
                if (dir != undefined) {
                    let files = dir.filter(CheckIfPs1);
                    this.setState({
                        scripts: files,
                        scriptLog: new Array(files.length),
                        scriptStatus: new Array(files.length),
                        scriptParam: new Array(files.length),
                        scriptAdm: new Array(files.length)
                    })
                }
            });
        }
    };

    componentDidMount() {
        this.updateColumnWidth();
        window.addEventListener('resize', this.updateColumnWidth);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updateColumnWidth);
    }

    updateColumnWidth() {
        let firstCol = (10 / 100) * window.innerWidth;
        let secondCol = (30 / 100) * window.innerWidth;
        let thirdCol = (40 / 100) * window.innerWidth;
        let forthCol = (10 / 100) * window.innerWidth;
        let fifthCol = (10 / 100) * window.innerWidth;
        let arr = [firstCol, secondCol, thirdCol, forthCol, fifthCol]
        this.setState({ colWidth: arr});
    }

    runPosh(id, event) {
        this.updateArray(id, this.state.scriptStatus, '', 'working');

        let cmd = `${this.state.scriptPath}/${this.state.scripts[id]} '${this.state.scriptParam[id]}'`;

        if (this.state.scriptAdm[id]) {
            let admCmd = `powershell.exe ${cmd}`
            let options = { name: 'SprayBottle' };
            let scriptLogArr = this.state.scriptLog;
            let scriptStatusArr = this.state.scriptStatus;
            let updateArrayMethod = this.updateArray;

            let result = sudo.exec(admCmd, options,
                function (error, stdout, stderr) {
                    if (error) {
                        updateArrayMethod(id, scriptLogArr, error.message)
                        updateArrayMethod(id, scriptStatusArr, '', 'error')
                    }
                    if (stdout) {
                        updateArrayMethod(id, scriptLogArr, stdout)
                        updateArrayMethod(id, scriptStatusArr, '', 'success')
                    }
                    if (stderr) {
                        updateArrayMethod(id, scriptLogArr, stderr)
                        updateArrayMethod(id, scriptStatusArr, '', 'error')
                    }
                }
            );
        }
        else {
            let ps = new powershell(cmd, {
                executionPolicy: 'Bypass',
                noProfile: true,
            })
            ps.on("error", err => {
                if (err) {
                    this.updateArray(id, this.state.scriptLog, err)
                    this.updateArray(id, this.state.scriptStatus, '', 'error')
                }
            });
            ps.on("output", data => {
                if (data) {
                    this.updateArray(id, this.state.scriptLog, data)
                    this.updateArray(id, this.state.scriptStatus, '', 'success')
                }
            });
            ps.on("error-output", data => {
                if (data) {
                    this.updateArray(id, this.state.scriptLog, data)
                    this.updateArray(id, this.state.scriptStatus, '', 'error')
                }
            });
        }
        event.preventDefault();
    }

    updateArray(id, arr, data, msg) {
        if (msg) {
            let newArr = arr
            newArr.splice(id, 1, msg);
            this.setState({ arr: newArr })
        }
        else {
            let newArr = arr
            newArr.splice(id, 1, data);
            this.setState({ arr: newArr })
        }
    }

    handleChange(id, event) {
        if (event.target.type == "text") {
            this.updateArray(id, this.state.scriptParam, event.target.value)
        }
        else {
            this.updateArray(id, this.state.scriptAdm, event.target.checked)
        }
    }

    render() {
        console.log()
        const cellRendererRun = (rowIndex) => {
            return (
                <Button
                    icon="play"
                    intent={Intent.PRIMARY}
                    minimal={true}
                    onClick={this.runPosh.bind(this, rowIndex)}
                />
            );
        };
        const cellRendererScript = (rowIndex) => {
            return (
                <a
                    href={this.state.scriptPath + '\\' + this.state.scripts[rowIndex]}
                    target="_blank">{this.state.scripts[rowIndex]}
                </a>
            );
        };
        const cellRendererParameters = (rowIndex) => {
            return (
                <input className="pt-input"
                    id="param"
                    value={this.state.scriptParam[rowIndex]}
                    onChange={this.handleChange.bind(this, rowIndex)}
                    type="text"
                    placeholder="Enter Parameters..."
                />
            );
        };
        const cellRendererAdmin = (rowIndex) => {
            return (
                <div>
                    <Switch
                        large={true}
                        style={{ margin: 10 }}
                        checked={this.state.scriptAdm[rowIndex]}
                        onChange={this.handleChange.bind(this, rowIndex)}
                    />
                </div>
            );
        };
        const cellRendererStatus = (rowIndex) => {
            let log = this.state.scriptLog[rowIndex];

            switch (this.state.scriptStatus[rowIndex]) {
                case 'working':
                    return (
                        <div>
                            <ScriptStatus
                                mode="spinner"
                                content={log}
                            />
                        </div>
                    );
                    break;
                case 'success':
                    return (
                        <div>
                            <ScriptStatus
                                mode="icon"
                                content={log}
                                icon="info-sign"
                                intent={Intent.SUCCESS}
                            />
                        </div>
                    );
                    break;
                case 'error':
                    return (
                        <div>
                            <ScriptStatus
                                mode="icon"
                                content={log}
                                icon="error"
                                intent={Intent.DANGER}
                            />
                        </div>
                    );
                    break;
                default:
                    return (<div></div>);
            }
        };
        return (
            <Table
                numRows={this.state.scripts.length}
                defaultRowHeight={40}
                enableMultipleSelection={false}
                enableRowHeader={false}
                enableRowResizing={false}
                enableColumnResizing={false}
                enableColumnReordering={false}
                selectionModes={SelectionModes.NONE}
                columnWidths={this.state.colWidth}
                style={{ width: "100%" }}
            >
                <Column name="Run" cellRenderer={cellRendererRun} />
                <Column name="Script" cellRenderer={cellRendererScript} />
                <Column name="Parameters" cellRenderer={cellRendererParameters} />
                <Column name="Admin" cellRenderer={cellRendererAdmin} />
                <Column name="Status" cellRenderer={cellRendererStatus} />
            </Table>
        );
    }
}

export default ScriptTable;