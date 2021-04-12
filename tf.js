const fs = require('fs')
const path = require('path')
const local_homedir = require('os').homedir()

function isDir(mode) {
    return (mode & fs.constants.S_IFMT) === fs.constants.S_IFDIR
}

// https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string/10420404
function humanFileSize(size_in_bytes) {
    const i = (size_in_bytes === 0) ? 0 : Math.floor(Math.log(size_in_bytes) / Math.log(1024))
    return (size_in_bytes / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}


class TransferManager {
    local_cwd = null
    remote_cwd = null
    div_id = null

    constructor(div_id) {
        this.div_id = div_id
        this.local_cwd = local_homedir
        this.remote_cwd = null

        const tf_div = document.getElementById(div_id)
        tf_div.className = "ui grid"

        const local_div = document.createElement("div")
        local_div.className = "eight wide column"
        local_div.innerHTML = this.fmGenerateDiv("local")
        local_div.style.overflow = "scroll"
        local_div.style.height = "100vh"
        tf_div.appendChild(local_div)

        const remote_div = document.createElement("div")
        remote_div.className = "eight wide column"
        remote_div.innerHTML = this.fmGenerateDiv("remote")
        remote_div.style.overflow = "scroll"
        remote_div.style.height = "100vh"
        tf_div.appendChild(remote_div)

        // setup the callbacks on the local side
        const fm_addrbar_form = document.getElementById(`${div_id}-local-fm_addrbar_form`)
        fm_addrbar_form.onsubmit = () => {
            return this.localVisit()
        }
        const fm_up_button = document.getElementById(`${div_id}-local-fm_up_button`)
        fm_up_button.onclick = () => {
            this.localUp()
        }
        const fm_checkall_box = document.getElementById(`${div_id}-local-fm_checkall_box`)
        fm_checkall_box.onclick = () => {
            this.fmCheckAll("local")
        }

        // setup the callbacks on the remote side

    }

    fmGenerateDiv(side) {
        return `
<form class="ui action fluid input" id="${this.div_id}-${side}-fm_addrbar_form">
    <button class="ui blue icon button" id="${this.div_id}-${side}-fm_up_button" type="button">
        <i class="arrow up icon"></i>
    </button>
    <label for="${this.div_id}-${side}-fm_addrbar""></label><input id="${this.div_id}-${side}-fm_addrbar" type="text">
    <button class="ui teal right labeled icon button" type="submit">
        <i class="arrow right icon"></i>
        Go
    </button>
</form>
<table class="ui celled striped table">
    <thead>
    <tr>
        <th class="collapsing">
            <div class="ui fitted checkbox">
                <input id="${this.div_id}-${side}-fm_checkall_box" type="checkbox">
                <label for="${this.div_id}-${side}-fm_checkall_box"></label>
            </div>
        </th>

        <th>Name</th>
        <th style="width: 12ch">Size</th>
        <th class="collapsing">Date Accessed</th>
        <th class="collapsing">Date Modified</th>
    </tr>
    </thead>
    <tbody id="${this.div_id}-${side}-file_table_body">
    </tbody>
</table>
`
    }

    tfClose() {
        this.local_cwd = null
        this.remote_cwd = null
    }

    fmUpdateAddrBar(side) {
        const fm_addrbar = document.getElementById(`${this.div_id}-${side}-fm_addrbar`)
        if (side === "local") {
            fm_addrbar.value = this.local_cwd
        } else {
            fm_addrbar.value = this.remote_cwd
        }
        const fm_addrbar_form = document.getElementById(`${this.div_id}-${side}-fm_addrbar_form`)
        fm_addrbar_form.classList.remove("error")
    }

    fmUpdateFileView(side, file_list) {
        const file_table_body = document.getElementById(`${this.div_id}-${side}-file_table_body`)
        file_table_body.innerHTML = ""

        file_list.forEach((file) => {
            const new_tr = document.createElement("tr")

            const checkbox_td = document.createElement("td")
            checkbox_td.className = "center aligned"

            const fm_checkbox_div = document.createElement("div")
            fm_checkbox_div.className = "ui fitted checkbox"
            const fm_checkbox = document.createElement("input")
            fm_checkbox.className = `${this.div_id}-${side}-fm_checkbox`
            fm_checkbox.type = "checkbox"
            fm_checkbox.onclick = () => {
                this.fmUncheckCheckAll(side)
            }
            fm_checkbox_div.appendChild(fm_checkbox)
            fm_checkbox_div.appendChild(document.createElement("label"))
            checkbox_td.appendChild(fm_checkbox_div)

            new_tr.appendChild(checkbox_td)

            const name_td = document.createElement("td")
            let size_td = document.createElement("td")
            if (isDir(file["mode"])) {
                name_td.innerHTML = "<i class=\"folder icon\"></i> "
                const enter_link = document.createElement("a")
                enter_link.style.userSelect = "none"
                enter_link.innerText = file["name"]
                enter_link.onclick = () => {
                    let dest_files = null
                    if (side === "local") {
                        dest_files = this.localLs(path.resolve(this.local_cwd, file["name"]))
                    } else {
                        // TODO: add remote ls handling
                    }
                    this.fmUpdateAddrBar(side)
                    this.fmUpdateFileView(side, dest_files)
                }
                name_td.append(enter_link)
            } else {
                name_td.innerHTML = "<i class=\"file icon\"></i> "
                name_td.innerHTML += file["name"]
                size_td.innerHTML = humanFileSize(file["size"])
            }
            new_tr.appendChild(name_td)
            new_tr.appendChild(size_td)

            const atime_td = document.createElement("td")
            atime_td.innerHTML = file["atime"].toLocaleDateString()
            new_tr.appendChild(atime_td)

            const mtime_td = document.createElement("td")
            mtime_td.innerHTML = file["mtime"].toLocaleDateString()
            new_tr.appendChild(mtime_td)

            file_table_body.appendChild(new_tr)
        })
    }

    fmCheckAll(side) {
        const fm_checkall_box = document.getElementById(`${this.div_id}-${side}-fm_checkall_box`)
        const fm_checkboxes = document.getElementsByClassName(`${this.div_id}-${side}-fm_checkbox`)

        if (fm_checkall_box.checked) {
            for (let fm_checkbox of fm_checkboxes) {
                fm_checkbox.checked = true
            }
        } else {
            for (let fm_checkbox of fm_checkboxes) {
                fm_checkbox.checked = false
            }
        }
    }

    fmUncheckCheckAll(side) {
        document.getElementById(`${this.div_id}-${side}-fm_checkall_box`).checked = false
    }

    localLs(path_input) {
        this.fmUncheckCheckAll("local")
        let new_cwd = this.local_cwd
        if (path_input !== "") {
            new_cwd = path.resolve(this.local_cwd, path_input)
        }

        const files = fs.readdirSync(new_cwd)
        let file_list = []
        files.forEach((filename) => {
            // TODO: should support showing hidden files
            if (filename.startsWith(".")) {
                return
            }
            const full_path = path.resolve(new_cwd, filename)
            try {
                const attrs = fs.statSync(full_path)
                file_list.push({
                    "name": filename,
                    "mode": attrs["mode"],
                    "size": attrs["size"],
                    "atime": attrs["atime"],
                    "mtime": attrs["mtime"]
                })
            } catch (e) {
                file_list.push({
                    "name": filename,
                    "mode": 0,
                    "size": 0,
                    "atime": new Date(0),
                    "mtime": new Date(0)
                })
            }
        })
        this.local_cwd = new_cwd
        return file_list
    }

    localUp() {
        try {
            const dest_files = this.localLs(path.resolve(this.local_cwd, ".."))
            this.fmUpdateAddrBar("local")
            this.fmUpdateFileView("local", dest_files)
        } catch (e) {
            alert(e)
        }
    }

    localVisit() {
        const fm_addrbar = document.getElementById(`${this.div_id}-local-fm_addrbar`)
        try {
            const dest_files = this.localLs(fm_addrbar.value)
            this.fmUncheckCheckAll("local")
            this.fmUpdateAddrBar("local")
            this.fmUpdateFileView("local", dest_files)
        } catch (e) {
            const fm_addrbar_form = document.getElementById(`${this.div_id}-local-fm_addrbar_form`)
            fm_addrbar_form.classList.add("error")
            alert(e)
        }

        return false
    }
}

