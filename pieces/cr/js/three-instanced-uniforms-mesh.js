import {InstancedMesh, MeshBasicMaterial, InstancedBufferAttribute} from "/-/three@v0.137.5-HJEdoVYPhjkiJWkt6XIa/dist=es2019,mode=imports/optimized/three.js";
import {createDerivedMaterial, getShaderUniformTypes, voidMainRegExp, getShadersForMaterial} from "/-/troika-three-utils@v0.45.0-4roP8xLkDHJq49UD17Pv/dist=es2019,mode=imports/optimized/troika-three-utils.js";
const precededByUniformRE = /\buniform\s+(int|float|vec[234])\s+$/;
const attrRefReplacer = (name, index, str) => precededByUniformRE.test(str.substr(0, index)) ? name : `troika_attr_${name}`;
const varyingRefReplacer = (name, index, str) => precededByUniformRE.test(str.substr(0, index)) ? name : `troika_vary_${name}`;
function createInstancedUniformsDerivedMaterial(baseMaterial) {
  let _uniformNames = [];
  let _uniformNamesKey = "";
  const derived = createDerivedMaterial(baseMaterial, {
    chained: true,
    customRewriter({vertexShader, fragmentShader}) {
      let vertexDeclarations = [];
      let vertexAssignments = [];
      let fragmentDeclarations = [];
      let vertexUniforms = getShaderUniformTypes(vertexShader);
      let fragmentUniforms = getShaderUniformTypes(fragmentShader);
      _uniformNames.forEach((name) => {
        let vertType = vertexUniforms[name];
        let fragType = fragmentUniforms[name];
        if (vertType || fragType) {
          let finder = new RegExp(`\\b${name}\\b`, "g");
          vertexDeclarations.push(`attribute ${vertType || fragType} troika_attr_${name};`);
          if (vertType) {
            vertexShader = vertexShader.replace(finder, attrRefReplacer);
          }
          if (fragType) {
            fragmentShader = fragmentShader.replace(finder, varyingRefReplacer);
            let varyingDecl = `varying ${fragType} troika_vary_${name};`;
            vertexDeclarations.push(varyingDecl);
            fragmentDeclarations.push(varyingDecl);
            vertexAssignments.push(`troika_vary_${name} = troika_attr_${name};`);
          }
        }
      });
      vertexShader = `${vertexDeclarations.join("\n")}
${vertexShader.replace(voidMainRegExp, `
$&
${vertexAssignments.join("\n")}`)}`;
      if (fragmentDeclarations.length) {
        fragmentShader = `${fragmentDeclarations.join("\n")}
${fragmentShader}`;
      }
      return {vertexShader, fragmentShader};
    }
  });
  derived.setUniformNames = function(uniformNames) {
    _uniformNames = uniformNames || [];
    const key = _uniformNames.sort().join("|");
    if (key !== _uniformNamesKey) {
      _uniformNamesKey = key;
      this.needsUpdate = true;
    }
  };
  const baseKey = derived.customProgramCacheKey();
  derived.customProgramCacheKey = function() {
    return baseKey + "|" + _uniformNamesKey;
  };
  derived.isInstancedUniformsMaterial = true;
  return derived;
}
class InstancedUniformsMesh extends InstancedMesh {
  constructor(geometry, material, count) {
    super(geometry, material, count);
    this._instancedUniformNames = [];
  }
  get geometry() {
    let derivedGeom = this._derivedGeometry;
    const baseGeom = this._baseGeometry;
    if (!derivedGeom || derivedGeom.baseGeometry !== baseGeom) {
      derivedGeom = this._derivedGeometry = Object.create(baseGeom);
      derivedGeom.baseGeometry = baseGeom;
      derivedGeom.attributes = Object.create(baseGeom.attributes);
      baseGeom.addEventListener("dispose", function onDispose() {
        derivedGeom.dispose();
      });
    }
    return derivedGeom;
  }
  set geometry(geometry) {
    this._baseGeometry = geometry;
  }
  get material() {
    let derivedMaterial = this._derivedMaterial;
    const baseMaterial = this._baseMaterial || this._defaultMaterial || (this._defaultMaterial = new MeshBasicMaterial());
    if (!derivedMaterial || derivedMaterial.baseMaterial !== baseMaterial) {
      derivedMaterial = this._derivedMaterial = createInstancedUniformsDerivedMaterial(baseMaterial);
      baseMaterial.addEventListener("dispose", function onDispose() {
        baseMaterial.removeEventListener("dispose", onDispose);
        derivedMaterial.dispose();
      });
    }
    derivedMaterial.setUniformNames(this._instancedUniformNames);
    return derivedMaterial;
  }
  set material(baseMaterial) {
    if (Array.isArray(baseMaterial)) {
      throw new Error("InstancedUniformsMesh does not support multiple materials");
    }
    while (baseMaterial && baseMaterial.isInstancedUniformsMaterial) {
      baseMaterial = baseMaterial.baseMaterial;
    }
    this._baseMaterial = baseMaterial;
  }
  get customDepthMaterial() {
    return this.material.getDepthMaterial();
  }
  get customDistanceMaterial() {
    return this.material.getDistanceMaterial();
  }
  setUniformAt(name, index, value) {
    const attrs = this.geometry.attributes;
    const attrName = `troika_attr_${name}`;
    let attr = attrs[attrName];
    if (!attr) {
      const defaultValue = getDefaultUniformValue(this._baseMaterial, name);
      const itemSize = getItemSizeForValue(defaultValue);
      attr = attrs[attrName] = new InstancedBufferAttribute(new Float32Array(itemSize * this.count), itemSize);
      if (defaultValue !== null) {
        for (let i = 0; i < this.count; i++) {
          setAttributeValue(attr, i, defaultValue);
        }
      }
      this._instancedUniformNames = [...this._instancedUniformNames, name];
    }
    setAttributeValue(attr, index, value);
    attr.needsUpdate = true;
  }
  unsetUniform(name) {
    this.geometry.deleteAttribute(`troika_attr_${name}`);
    this._instancedUniformNames = this._instancedUniformNames.filter((n) => n !== name);
  }
}
function setAttributeValue(attr, index, value) {
  let size = attr.itemSize;
  if (size === 1) {
    attr.setX(index, value);
  } else if (size === 2) {
    attr.setXY(index, value.x, value.y);
  } else if (size === 3) {
    if (value.isColor) {
      attr.setXYZ(index, value.r, value.g, value.b);
    } else {
      attr.setXYZ(index, value.x, value.y, value.z);
    }
  } else if (size === 4) {
    attr.setXYZW(index, value.x, value.y, value.z, value.w);
  }
}
function getDefaultUniformValue(material, name) {
  let uniforms = material.uniforms;
  if (uniforms && uniforms[name]) {
    return uniforms[name].value;
  }
  uniforms = getShadersForMaterial(material).uniforms;
  if (uniforms && uniforms[name]) {
    return uniforms[name].value;
  }
  return null;
}
function getItemSizeForValue(value) {
  return value == null ? 0 : typeof value === "number" ? 1 : value.isVector2 ? 2 : value.isVector3 || value.isColor ? 3 : value.isVector4 ? 4 : Array.isArray(value) ? value.length : 0;
}
export {InstancedUniformsMesh, createInstancedUniformsDerivedMaterial};
export default null;
