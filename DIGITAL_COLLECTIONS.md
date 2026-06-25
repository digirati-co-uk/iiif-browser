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
