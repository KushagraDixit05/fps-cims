from rest_framework.routers import DefaultRouter
from .views import ProductMasterViewSet, ProductDemoViewSet

router = DefaultRouter()
router.register('product-master', ProductMasterViewSet, basename='productmaster')
router.register('product-demos',  ProductDemoViewSet,   basename='productdemo')

urlpatterns = router.urls
