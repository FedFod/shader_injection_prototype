autowatch = 1;

include("FF_Utilities.js");

// const glGridshape = new JitterObject("jit.gl.gridshape");
// const glMaterial = new JitterObject("jit.gl.material");
// glGridshape.material = glMaterial.name;

const vertexInfraShaderPath = "infra_VertexShader.glsl";
const fragmentInfraShaderPath = "infra_FragmentShader.glsl";
const modifiedShaderPath = "modified_shader.jxs";
const originalShaderPath = "1_light_directional_texcoord.jxs";

function open_infra_vertex_shader() {
	// glGridshape.get_gl3_shader();
	openInfraShader(vertexInfraShaderPath, "vertex");
}

function open_infra_fragment_shader() {
	// glGridshape.get_gl3_shader();
	openInfraShader(fragmentInfraShaderPath, "fragment");
}

function openInfraShader(shaderPath, type) {
	const f = new File(shaderPath);
	if (!f.isopen) {
		if (type=="vertex") {
			createVertexInfraShaderFile();
		} else if (type=="fragment") {
			createFragmentInfraShaderFile();
		}
	}
	max.message("openfile","id", shaderPath);
}
openInfraShader.local = true;

function createVertexInfraShaderFile() {
	const infraShaderContent = `
	struct VertData {
		vec3 vertex_position;
		vec3 vertex_normal;
	} vertdata;
	
	void vert(inout VertData v) {
		// v.vertex_position.x = sin(v.vertex_position.x*10.);
	}
	`;
	cleanfile(vertexInfraShaderPath);
	writefile(vertexInfraShaderPath, infraShaderContent);
}
createVertexInfraShaderFile.local = true;

function createFragmentInfraShaderFile() {
	const infraShaderContent = `
	struct FragData {
		vec2 uv;
		vec3 view_normal;
		vec4 diffuse;
	} fragdata;
	
	void frag(inout FragData f) {
		f.diffuse = vec4(1.,0.,0.,1.);
	}
	`;
	cleanfile(fragmentInfraShaderPath);
	writefile(fragmentInfraShaderPath, infraShaderContent);
}
createFragmentInfraShaderFile.local = true;

function prepareShaderForVertexInjection(jxsString) {
	const originalVertexShaderCode = 'gl_Position = modelViewProjectionMatrix*vec4(jit_position, 1.);';
	const infraVertexShaderReplacementCode = `
		fillVertdata(jit_position, jit_normal);
		vert(vertdata);
		gl_Position = modelViewProjectionMatrix*vec4(vertdata.vertex_position, 1.);
		`;

	const originalVoidMainCode = 'void main() {';
	const infraVertexShaderMainCode = `
		struct VertData {
			vec3 vertex_position;
			vec3 vertex_normal;
		} vertdata;

		void vert(inout VertData v) {};

		void fillVertdata(in vec3 pos, in vec3 nor) {
			vertdata.vertex_position = pos;
			vertdata.vertex_normal = nor;
		}

		void main() {
		`;

	let newShaderText = jxsString.replace(originalVertexShaderCode, infraVertexShaderReplacementCode);
	newShaderText = newShaderText.replace(originalVoidMainCode, infraVertexShaderMainCode);
	return newShaderText;
}
prepareShaderForVertexInjection.local = true;

function prepareShaderForFragmentInjection(jxsString) {
	const originalFragmentShaderCode = "jit_Material.color += frontMaterial.emission;";
	const infraFragmentShaderReplacementCode = `
		fillFragData(jit_in.jit_Surface_texcoord0, Nn, frontMaterial);
		frag(fragdata);
		jit_Material.color += frontMaterial.emission;
		`;
	
	const originalVoidMainCode = 'void main() {';
	const infraFragmentShaderMainCode = `
		struct FragData {
			vec2 uv;
			vec3 view_normal;
			vec4 diffuse;
		} fragdata;

		void frag(inout FragData f) {};

		void fillFragData(in vec2 uv, in vec3 nor, in MaterialParameters frontMaterial) {
			fragdata.uv = uv;
			fragdata.view_normal = nor;
			fragdata.diffuse = frontMaterial.diffuse;
		}

		void main() {
		`;

	let newShaderText = jxsString.replace(originalFragmentShaderCode, infraFragmentShaderReplacementCode);
	newShaderText = newShaderText.replace("frontMaterial.diffuse", "fragdata.diffuse");
	newShaderText = replaceAfterProgramTag(newShaderText, originalVoidMainCode, infraFragmentShaderMainCode, '<program name="fs" type="fragment">');
	return newShaderText;
}
prepareShaderForFragmentInjection.local = true;

function injectVertexCode(jxsString) {
	const infraVertexShaderNewCode = getFileAsString(vertexInfraShaderPath);
	const newVertFunction = getVertFunctionFromInfraShader(infraVertexShaderNewCode);

	const vertFunctionDefaultCode = "void vert(inout VertData v) {};";
	
	return jxsString.replace(vertFunctionDefaultCode, newVertFunction);
}
injectVertexCode.local = true;

function injectFragmentCode(jxsString) {
	const infraFragmentShaderNewCode = getFileAsString(fragmentInfraShaderPath);
	const newFragFunction = getFragFunctionFromInfraShader(infraFragmentShaderNewCode);

	const fragFunctionDefaultCode = "void frag(inout FragData f) {};";
	
	return jxsString.replace(fragFunctionDefaultCode, newFragFunction);
}
injectVertexCode.local = true;

function modify_shader() {
	const originalJXSText = getFileAsString(originalShaderPath);

	let newShaderText = prepareShaderForVertexInjection(originalJXSText);
	newShaderText = prepareShaderForFragmentInjection(newShaderText);
	newShaderText = injectVertexCode(newShaderText);
	newShaderText = injectFragmentCode(newShaderText);
	// FF_Utils.Print(newShaderText)

	cleanfile(modifiedShaderPath);
	writefile(modifiedShaderPath, newShaderText);
}

function getVertFunctionFromInfraShader(infraShaderText) {
	// Regular expression to match the vert function
		const vertFunctionRegex = /void vert\(inout VertData v\) \{([\s\S]*?)\}/;

		// Extract the vert function
		const match = infraShaderText.match(vertFunctionRegex);
		// Return the matched function body if found, otherwise return null
		// FF_Utils.Print("MATCH",match[1])
		if (match && match.length > 1) {
			return `void vert(inout VertData v) {${match[1]}}`;
		}
		return null;
}
getVertFunctionFromInfraShader.local = true;

function getFragFunctionFromInfraShader(infraShaderText) {
	// Regular expression to match the vert function
		const fragFunctionRegex = /void frag\(inout FragData f\) \{([\s\S]*?)\}/;

		// Extract the vert function
		const match = infraShaderText.match(fragFunctionRegex);
		// Return the matched function body if found, otherwise return null
		// FF_Utils.Print("MATCH",match[1])
		if (match && match.length > 1) {
			return `void frag(inout FragData f) {${match[1]}}`;
		}
		return null;
}
getFragFunctionFromInfraShader.local = true;

///////////////////////////////////////////
function replaceAfterProgramTag(originalString, searchString, replaceString, programTag) {
    // Find the index of the program tag
    let programTagIndex = originalString.indexOf(programTag);
    
    // If the program tag is not found, return the original string
    if (programTagIndex === -1) {
        return originalString;
    }
    
    // Find the index of the first occurrence of the search string after the program tag
    let searchStringIndex = originalString.indexOf(searchString, programTagIndex + programTag.length);
    
    // If the search string is not found after the program tag, return the original string
    if (searchStringIndex === -1) {
        return originalString;
    }
    
    // Replace the search string with the replacement string
    return originalString.slice(0, searchStringIndex) +
           replaceString +
           originalString.slice(searchStringIndex + searchString.length);
}

function getFileAsString(path) {
	const jxsLines = readfileToArray(path);
	// transform text into string
	const jxsText = jxsLines.join('\n');
	return jxsText;
}

function readfileToArray(path) {
	const fileLines = [];

	const f = new File(path);
	let i,a;

	if (f.isopen) {
		i=0;
		while ((a = f.readline()) != null) { // returns a string
            fileLines.push(a);
			// post("line[" + i + "]: " + a + "\n");
			i++;
		}
		f.close();
	}
	else {
		post("READ FILE TO ARRAY\n");
		post("could not create file: " + path + "\n");
	}
	return fileLines;
}

function writefile(s, text)
{
	const f = new File(s,"write"); 
	const s2 = text;

	if (f.isopen) {
		f.writestring(s2); //writes a string
		f.close();
	} else {
		post("could not create file: " + s + "\n");
	}
}

function cleanfile(s)
{
	const f = new File(s,"write"); 

	if (f.isopen) {
		let a;
		// erase previous content
		f.eof = 0;
		while ((a = f.readline()) != null) { 
            f.writeline(" \n"); 
		}
		f.close();
	} else {
		post("could not create file: " + s + "\n");
	}
}

function notifydeleted() {
	// glGridshape.freepeer();
	// glMaterial.freepeer();
}
