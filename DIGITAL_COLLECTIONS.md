# Digital collections

This is a part of the IIIF Browser that is specifically designed for loading IIIF Resources from digital collections. These are maintained individually and recorded here. The strategy for each is here, with examples and can be used to validate and update if things change.

## Leeds

Example URL from Digital Collections:

```
https://explore.library.leeds.ac.uk/special-collections-explore/372659/horae_beatae_mariae_virginis
```

Manifest to be extracted:

```
https://iiif.library.leeds.ac.uk/presentation/cc/pfk4sgw8
```

**Strategy**

- Fetch the URL of the Digital Collections page
- Extract the manifest URL from the page

IIIF Link in the HTML:

```html
<p>
  <strong><a href="https://iiif.io/" target="_blank" title="Visit IIIF Website" style="text-decoration: none;>
      <img src="/imu/img/iiif.png" />
    </a>
    Manifest:</strong>
  https://iiif.library.leeds.ac.uk/presentation/cc/pfk4sgw8
  <a href="#imu_iiif_help" data-toggle="modal" title="What is a IIIF manifest?">
    <span class="tk-icon tk-icon-alert-info " aria-hidden="true"></span>
  </a>
</p>
<p>
  <strong>Persistent link:</strong> https://explore.library.leeds.ac.uk/special-collections-explore/372659
  <a href="#imu_permalink_help" data-toggle="modal" title="What is the persistent link?"><span class="tk-icon tk-icon-alert-info " aria-hidden="true"></span></a>
</p>
```

For search results, we can do something very leeds-specific. For example:

https://explore.library.leeds.ac.uk/special-collections-explore?&cct=25664f81ebfa3da5b4c251780ad28b0b35a1a02caaf909df871d67820c87b986&displayMedia=image&displayOption=grid&resultLength=60&resultStart=1

If we are on this page, we can extract the manifest URL from the image URL.

```html
<div class="card-flat card-stacked-sm skin-box-white skin-bd-b">
  <div class="card-img card-img-1-3 card-img-1-4-xs">
    <div
      class="rs-img rs-img-2-1 color-white text-center lul-no-bk-img"
      style="background-image: url('https://iiif.library.leeds.ac.uk/thumbs/gz49bmf8_objects_446375_001.tif/full/200,155/0/default.jpg')"
    >
      <a
        href="https://explore.library.leeds.ac.uk/special-collections-explore/446375/documents_relating_to_various_properties?&amp;cct=25664f81ebfa3da5b4c251780ad28b0b35a1a02caaf909df871d67820c87b986&amp;displayMedia=image&amp;displayOption=grid&amp;resultLength=60&amp;resultOffset=1"
        title=""
        ><img
          src="https://iiif.library.leeds.ac.uk/thumbs/gz49bmf8_objects_446375_001.tif/full/200,155/0/default.jpg"
          alt=""
      /></a>
    </div>
    <img src="/imu/img/iiif.png" class="card-badge" alt="Icon" />
  </div>
  <div class="card-content equalize-inner" style="height: 107px;">
    <span class="equalizer-inner" style="display:block;">
      DOCUMENTS RELATING TO VARIOUS PROPERTIES
      <p>
        <a
          class="more"
          href="https://explore.library.leeds.ac.uk/special-collections-explore/446375/documents_relating_to_various_properties?&amp;cct=25664f81ebfa3da5b4c251780ad28b0b35a1a02caaf909df871d67820c87b986&amp;displayMedia=image&amp;displayOption=grid&amp;resultLength=60&amp;resultOffset=1"
          >More</a
        >
      </p>
    </span>
  </div>
</div>
```

If we extract this thumbnail:

```
https://iiif.library.leeds.ac.uk/thumbs/gz49bmf8_objects_446375_001.tif/full/200,155/0/default.jpg
```

We can rebuild the Manifest URL from it:

```
https://iiif.library.leeds.ac.uk/presentation/cc/gz49bmf8
```

However, we should only do that if there is `/imu/img/iiif.png` IIIF logo inside the card.

These search results pages can return multiple results, so the result will be a virutal IIIF Collection.
