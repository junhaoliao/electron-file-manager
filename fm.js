const fs = require('fs')
const homedir = require('os').homedir()
const path = require('path')
let cwd = null

function isDir(mode) {
    return (mode & fs.constants.S_IFMT) === fs.constants.S_IFDIR
}

// https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string/10420404
function humanFileSize(size) {
    const i = (size === 0) ? 0 : Math.floor(Math.log(size) / Math.log(1024))
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}


class FileManager {
    cwd = null
    div_id = null

    constructor(div_id) {
        this.cwd = homedir
        this.div_id = div_id
        const fm_div = document.getElementById(div_id)
        fm_div.innerHTML = `
<form class="ui action fluid input" id="${div_id}-fm_addrbar_form">
    <button class="ui blue icon button" id="${div_id}-fm_up_button" type="button">
        <i class="arrow up icon"></i>
    </button>
    <label for="${div_id}-fm_addrbar""></label><input id="${div_id}-fm_addrbar" type="text">
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
                <input id="${div_id}-fm_checkall_box" type="checkbox">
                <label for="${div_id}-fm_checkall_box"></label>
            </div>
        </th>

        <th>Name</th>
        <th style="width: 12ch">Size</th>
        <th class="collapsing">Date Accessed</th>
        <th class="collapsing">Date Modified</th>
    </tr>
    </thead>
    <tbody id="${div_id}-file_table_body">
    </tbody>
</table>
`
        const fm_addrbar_form = document.getElementById(`${div_id}-fm_addrbar_form`)
        fm_addrbar_form.onsubmit = ()=>{
            return this.fm_visit()
        }
        const fm_up_button = document.getElementById(`${div_id}-fm_up_button`)
        fm_up_button.onclick = ()=>{
            this.fm_up()
        }
        const fm_checkall_box = document.getElementById(`${div_id}-fm_checkall_box`)
        fm_checkall_box.onclick = ()=>{
            this.checkAll()
        }
    }

    fm_close() {
        cwd = null
    }

    fm_ls(path_input) {
        this.uncheckCheckAll()
        let new_cwd = this.cwd
        if (path_input !== "") {
            new_cwd = path.resolve(this.cwd, path_input)
        }

        let files = null
        try {
            files = fs.readdirSync(new_cwd)
        } catch (e) {
            alert(e)
            throw e
        }

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
        this.cwd = new_cwd
        return file_list
    }


    updateAddrBar() {
        const fm_addrbar = document.getElementById(`${this.div_id}-fm_addrbar`)
        fm_addrbar.value = this.cwd
        const fm_addrbar_form = document.getElementById(`${this.div_id}-fm_addrbar_form`)
        fm_addrbar_form.classList.remove("error")
    }

    updateFileView(file_list) {
        const file_table_body = document.getElementById(`${this.div_id}-file_table_body`)
        file_table_body.innerHTML = ""

        file_list.forEach((file) => {
            const new_tr = document.createElement("tr")

            const checkbox_td = document.createElement("td")
            checkbox_td.className = "center aligned"

            const fm_checkbox_div = document.createElement("div")
            fm_checkbox_div.className = "ui fitted checkbox"
            const fm_checkbox = document.createElement("input")
            fm_checkbox.className = `${this.div_id}-fm_checkbox`
            fm_checkbox.type = "checkbox"
            fm_checkbox.onclick = this.uncheckCheckAll
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
                    const dest_files = this.fm_ls(path.resolve(this.cwd, file["name"]))
                    this.updateAddrBar()
                    this.updateFileView(dest_files)
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

    fm_up() {
        const dest_files = this.fm_ls(path.resolve(this.cwd, ".."))
        this.updateAddrBar()
        this.updateFileView(dest_files)
    }

    fm_visit() {
        const fm_addrbar = document.getElementById(`${this.div_id}-fm_addrbar`)
        try {
            const dest_files = this.fm_ls(fm_addrbar.value)
            this.uncheckCheckAll()
            this.updateAddrBar()
            this.updateFileView(dest_files)
        } catch (e) {
            const fm_addrbar_form = document.getElementById(`${this.div_id}-fm_addrbar_form`)
            fm_addrbar_form.classList.add("error")
            alert(e)
        }

        return false
    }

    checkAll() {
        const fm_checkall_box = document.getElementById(`${this.div_id}-fm_checkall_box`)
        const fm_checkboxes = document.getElementsByClassName(`${this.div_id}-fm_checkbox`)

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

    uncheckCheckAll() {
        document.getElementById(`${this.div_id}-fm_checkall_box`).checked = false
    }
}

